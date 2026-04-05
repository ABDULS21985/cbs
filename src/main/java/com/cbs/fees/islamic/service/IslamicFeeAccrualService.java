package com.cbs.fees.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.entity.FeeChargeLog;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.repository.IslamicFeeConfigurationRepository;
import com.cbs.fees.repository.FeeChargeLogRepository;
import com.cbs.gl.service.GeneralLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicFeeAccrualService {

    private static final String FEE_RECEIVABLE_GL = "1630-FEE-001";
    private static final String DEFERRED_FEE_GL = "2400-FEE-001";

    private final IslamicFeeConfigurationRepository configRepository;
    private final FeeChargeLogRepository feeChargeLogRepository;
    private final AccountRepository accountRepository;
    private final GeneralLedgerService generalLedgerService;
    private final AccountPostingService accountPostingService;
    private final IslamicFeeService islamicFeeService;
    private final CurrentActorProvider actorProvider;

    public void accruePeriodicFees(LocalDate accrualDate) {
        // Use targeted query instead of loading all fee configs
        List<IslamicFeeConfiguration> periodicFees = configRepository.findByStatusOrderByFeeCodeAsc("ACTIVE").stream()
                .filter(cfg -> cfg.isEffectiveOn(accrualDate))
                .filter(cfg -> List.of("MONTHLY", "QUARTERLY", "ANNUALLY").contains(cfg.getChargeFrequency()))
                .toList();

        // Use paginated queries instead of loading all accounts
        int pageSize = 200;
        int page = 0;
        org.springframework.data.domain.Page<Account> accountPage;
        do {
            accountPage = accountRepository.findByStatus(AccountStatus.ACTIVE,
                    org.springframework.data.domain.PageRequest.of(page, pageSize));
            for (Account account : accountPage.getContent()) {
                accrueFeesForSingleAccount(account, periodicFees, accrualDate);
            }
            page++;
        } while (accountPage.hasNext());
    }

    private void accrueFeesForSingleAccount(Account account, List<IslamicFeeConfiguration> periodicFees, LocalDate accrualDate) {
        for (IslamicFeeConfiguration config : periodicFees) {
                if (account.getProduct() == null) {
                    continue;
                }
                if (!IslamicFeeSupport.matchesAny(account.getProduct().getCode(), config.getApplicableProductCodes())) {
                    continue;
                }
                if (!isDueForAccrual(config, accrualDate)) {
                    continue;
                }
                String triggerRef = buildAccrualTriggerRef(config, account, accrualDate);
                if (feeChargeLogRepository.existsByTriggerRef(triggerRef)) {
                    continue;
                }
                IslamicFeeResponses.FeeCalculationResult calculation = islamicFeeService.calculateFee(
                        config.getId(),
                        IslamicFeeResponses.FeeCalculationContext.builder()
                                .transactionAmount(account.getBookBalance())
                                .accountBalance(account.getBookBalance())
                                .currencyCode(account.getCurrencyCode())
                                .build()
                );
                if (calculation.getCalculatedAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                String incomeGl = config.isCharityRouted() ? config.getCharityGlAccount() : config.getIncomeGlAccount();
                var journal = generalLedgerService.postJournal(
                        "ACCRUAL",
                        "Periodic Islamic fee accrual " + config.getFeeCode(),
                        "ISLAMIC_FEE_ENGINE",
                        triggerRef,
                        accrualDate,
                        actorProvider.getCurrentActor(),
                        List.of(
                                new GeneralLedgerService.JournalLineRequest(FEE_RECEIVABLE_GL, calculation.getCalculatedAmount(), BigDecimal.ZERO,
                                        account.getCurrencyCode(), BigDecimal.ONE, "Fee receivable accrual", null, account.getBranchCode(), account.getId(),
                                        account.getCustomer() != null ? account.getCustomer().getId() : null),
                                new GeneralLedgerService.JournalLineRequest(incomeGl, BigDecimal.ZERO, calculation.getCalculatedAmount(),
                                        account.getCurrencyCode(), BigDecimal.ONE, "Fee income accrual", null, account.getBranchCode(), account.getId(),
                                        account.getCustomer() != null ? account.getCustomer().getId() : null)
                        )
                );

                feeChargeLogRepository.save(FeeChargeLog.builder()
                        .feeCode(config.getFeeCode())
                        .accountId(account.getId())
                        .customerId(account.getCustomer() != null ? account.getCustomer().getId() : null)
                        .baseAmount(account.getBookBalance())
                        .feeAmount(calculation.getCalculatedAmount())
                        .taxAmount(BigDecimal.ZERO)
                        .totalAmount(calculation.getCalculatedAmount())
                        .currencyCode(account.getCurrencyCode())
                        .triggerEvent("PERIODIC_ACCRUAL")
                        .triggerRef(triggerRef)
                        .triggerAmount(account.getBookBalance())
                        .journalRef(journal.getJournalNumber())
                        .islamicFeeConfigurationId(config.getId())
                        .charityRouted(config.isCharityRouted())
                        .receivableBalance(calculation.getCalculatedAmount())
                        .status("ACCRUED")
                        .chargedAt(Instant.now())
                        .build());
        }
    }

    public void recogniseFeeOnCollection(Long feeChargeId, BigDecimal amountCollected, String transactionRef) {
        FeeChargeLog chargeLog = feeChargeLogRepository.findById(feeChargeId)
                .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", feeChargeId));
        Account account = accountRepository.findByIdWithProduct(chargeLog.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", chargeLog.getAccountId()));
        BigDecimal amount = IslamicFeeSupport.money(amountCollected);
        if (chargeLog.getReceivableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Collection amount exceeds receivable balance", "FEE_COLLECTION_EXCEEDS_RECEIVABLE");
        }
        accountPostingService.postDebitAgainstGl(
                account,
                TransactionType.FEE_DEBIT,
                amount,
                "Fee collection against receivable",
                TransactionChannel.SYSTEM,
                transactionRef,
                FEE_RECEIVABLE_GL,
                "ISLAMIC_FEE_ENGINE",
                transactionRef
        );
        chargeLog.setReceivableBalance(IslamicFeeSupport.money(chargeLog.getReceivableBalance().subtract(amount)));
        if (chargeLog.getReceivableBalance().compareTo(BigDecimal.ZERO) == 0) {
            chargeLog.setStatus("COLLECTED");
        }
        feeChargeLogRepository.save(chargeLog);
    }

    public void deferUpfrontFee(Long feeChargeId, BigDecimal totalAmount, int deferralMonths) {
        FeeChargeLog chargeLog = feeChargeLogRepository.findById(feeChargeId)
                .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", feeChargeId));
        IslamicFeeConfiguration config = configRepository.findById(chargeLog.getIslamicFeeConfigurationId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeConfiguration", "id", chargeLog.getIslamicFeeConfigurationId()));
        if (deferralMonths <= 0) {
            throw new BusinessException("Deferral months must be positive", "FEE_DEFERRAL_MONTHS_REQUIRED");
        }
        BigDecimal amount = IslamicFeeSupport.money(totalAmount);
        generalLedgerService.postJournal(
                "ADJUSTMENT",
                "Deferred upfront Islamic fee " + chargeLog.getFeeCode(),
                "ISLAMIC_FEE_ENGINE",
                chargeLog.getTriggerRef() + ":DEFER",
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(config.getIncomeGlAccount(), amount, BigDecimal.ZERO, chargeLog.getCurrencyCode(),
                                BigDecimal.ONE, "Reverse immediate fee income", null, "HEAD", chargeLog.getAccountId(), chargeLog.getCustomerId()),
                        new GeneralLedgerService.JournalLineRequest(DEFERRED_FEE_GL, BigDecimal.ZERO, amount, chargeLog.getCurrencyCode(),
                                BigDecimal.ONE, "Deferred fee income", null, "HEAD", chargeLog.getAccountId(), chargeLog.getCustomerId())
                )
        );
        chargeLog.setDeferredTotalAmount(amount);
        chargeLog.setDeferredRemainingAmount(amount);
        chargeLog.setRecognisedDeferredAmount(BigDecimal.ZERO);
        chargeLog.setDeferralMonths(deferralMonths);
        chargeLog.setLastDeferredRecognitionDate(null);
        chargeLog.setStatus("DEFERRED");
        feeChargeLogRepository.save(chargeLog);
    }

    public void recogniseDeferredFees(LocalDate recognitionDate) {
        for (FeeChargeLog chargeLog : feeChargeLogRepository.findByDeferredRemainingAmountGreaterThanOrderByChargedAtAsc(BigDecimal.ZERO)) {
            if (chargeLog.getDeferralMonths() == null || chargeLog.getDeferralMonths() <= 0) {
                continue;
            }
            if (chargeLog.getLastDeferredRecognitionDate() != null
                    && !chargeLog.getLastDeferredRecognitionDate().isBefore(recognitionDate.withDayOfMonth(1))) {
                continue;
            }
            IslamicFeeConfiguration config = configRepository.findById(chargeLog.getIslamicFeeConfigurationId())
                    .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeConfiguration", "id", chargeLog.getIslamicFeeConfigurationId()));
            BigDecimal monthlyPortion = chargeLog.getDeferredTotalAmount()
                    .divide(BigDecimal.valueOf(chargeLog.getDeferralMonths()), 2, RoundingMode.HALF_UP);
            BigDecimal amount = chargeLog.getDeferredRemainingAmount().min(monthlyPortion);
            String recognitionRef = chargeLog.getTriggerRef() + ":RECOG:" + recognitionDate.withDayOfMonth(1);
            if (feeChargeLogRepository.existsByTriggerRef(recognitionRef)) {
                continue;
            }
            generalLedgerService.postJournal(
                    "ADJUSTMENT",
                    "Deferred Islamic fee recognition " + chargeLog.getFeeCode(),
                    "ISLAMIC_FEE_ENGINE",
                    recognitionRef,
                    recognitionDate,
                    actorProvider.getCurrentActor(),
                    List.of(
                            new GeneralLedgerService.JournalLineRequest(DEFERRED_FEE_GL, amount, BigDecimal.ZERO, chargeLog.getCurrencyCode(),
                                    BigDecimal.ONE, "Deferred fee release", null, "HEAD", chargeLog.getAccountId(), chargeLog.getCustomerId()),
                            new GeneralLedgerService.JournalLineRequest(config.getIncomeGlAccount(), BigDecimal.ZERO, amount, chargeLog.getCurrencyCode(),
                                    BigDecimal.ONE, "Fee income recognition", null, "HEAD", chargeLog.getAccountId(), chargeLog.getCustomerId())
                    )
            );
            chargeLog.setRecognisedDeferredAmount(IslamicFeeSupport.money(chargeLog.getRecognisedDeferredAmount().add(amount)));
            chargeLog.setDeferredRemainingAmount(IslamicFeeSupport.money(chargeLog.getDeferredRemainingAmount().subtract(amount)));
            chargeLog.setLastDeferredRecognitionDate(recognitionDate);
            if (chargeLog.getDeferredRemainingAmount().compareTo(BigDecimal.ZERO) == 0) {
                chargeLog.setStatus("RECOGNISED");
            }
            feeChargeLogRepository.save(chargeLog);
            feeChargeLogRepository.save(FeeChargeLog.builder()
                    .feeCode(chargeLog.getFeeCode())
                    .accountId(chargeLog.getAccountId())
                    .customerId(chargeLog.getCustomerId())
                    .baseAmount(chargeLog.getBaseAmount())
                    .feeAmount(amount)
                    .taxAmount(BigDecimal.ZERO)
                    .totalAmount(amount)
                    .currencyCode(chargeLog.getCurrencyCode())
                    .triggerEvent("DEFERRED_RECOGNITION")
                    .triggerRef(recognitionRef)
                    .triggerAmount(chargeLog.getTriggerAmount())
                    .journalRef(recognitionRef)
                    .islamicFeeConfigurationId(chargeLog.getIslamicFeeConfigurationId())
                    .charityRouted(chargeLog.getCharityRouted())
                    .status("RECOGNISED")
                    .chargedAt(recognitionDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant())
                    .build());
        }
    }

    @Transactional(readOnly = true)
    public IslamicFeeResponses.FeeReceivableAging getFeeReceivableAging() {
        LocalDate today = LocalDate.now();
        BigDecimal currentBucket = BigDecimal.ZERO;
        BigDecimal bucket30 = BigDecimal.ZERO;
        BigDecimal bucket60 = BigDecimal.ZERO;
        BigDecimal bucket90 = BigDecimal.ZERO;
        BigDecimal bucket90Plus = BigDecimal.ZERO;

        for (FeeChargeLog logEntry : feeChargeLogRepository.findByStatusAndReceivableBalanceGreaterThanOrderByChargedAtAsc("ACCRUED", BigDecimal.ZERO)) {
            long ageDays = ChronoUnit.DAYS.between(logEntry.getChargedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate(), today);
            if (ageDays <= 30) {
                currentBucket = currentBucket.add(logEntry.getReceivableBalance());
            } else if (ageDays <= 60) {
                bucket30 = bucket30.add(logEntry.getReceivableBalance());
            } else if (ageDays <= 90) {
                bucket60 = bucket60.add(logEntry.getReceivableBalance());
            } else if (ageDays <= 120) {
                bucket90 = bucket90.add(logEntry.getReceivableBalance());
            } else {
                bucket90Plus = bucket90Plus.add(logEntry.getReceivableBalance());
            }
        }
        return IslamicFeeResponses.FeeReceivableAging.builder()
                .currentBucket(IslamicFeeSupport.money(currentBucket))
                .bucket30Days(IslamicFeeSupport.money(bucket30))
                .bucket60Days(IslamicFeeSupport.money(bucket60))
                .bucket90Days(IslamicFeeSupport.money(bucket90))
                .bucket90PlusDays(IslamicFeeSupport.money(bucket90Plus))
                .build();
    }

    @Transactional(readOnly = true)
    public IslamicFeeResponses.FeeIncomeReport getFeeIncomeReport(LocalDate fromDate, LocalDate toDate) {
        List<FeeChargeLog> logs = feeChargeLogRepository.findByChargedAtBetweenOrderByChargedAtDesc(
                fromDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant(),
                toDate.plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant()
        );
        BigDecimal ujrahIncome = BigDecimal.ZERO;
        BigDecimal charityRouted = BigDecimal.ZERO;
        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        for (FeeChargeLog logEntry : logs) {
            IslamicFeeConfiguration config = logEntry.getIslamicFeeConfigurationId() == null ? null
                    : configRepository.findById(logEntry.getIslamicFeeConfigurationId()).orElse(null);
            if (config == null) {
                continue;
            }
            BigDecimal recognisedAmount = recognisedIncomeAmount(logEntry);
            if (recognisedAmount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            if (logEntry.getCharityRouted()) {
                charityRouted = charityRouted.add(recognisedAmount);
            } else {
                ujrahIncome = ujrahIncome.add(recognisedAmount);
            }
            byCategory.merge(config.getFeeCategory(), recognisedAmount, BigDecimal::add);
        }
        BigDecimal deferredBalance = feeChargeLogRepository.findByDeferredRemainingAmountGreaterThanOrderByChargedAtAsc(BigDecimal.ZERO)
                .stream()
                .map(FeeChargeLog::getDeferredRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal receivableBalance = feeChargeLogRepository.findByStatusAndReceivableBalanceGreaterThanOrderByChargedAtAsc("ACCRUED", BigDecimal.ZERO)
                .stream()
                .map(FeeChargeLog::getReceivableBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return IslamicFeeResponses.FeeIncomeReport.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .ujrahIncome(IslamicFeeSupport.money(ujrahIncome))
                .charityRoutedAmount(IslamicFeeSupport.money(charityRouted))
                .deferredFeeBalance(IslamicFeeSupport.money(deferredBalance))
                .feeReceivableBalance(IslamicFeeSupport.money(receivableBalance))
                .byFeeCategory(byCategory)
                .build();
    }

    private boolean isDueForAccrual(IslamicFeeConfiguration config, LocalDate accrualDate) {
        return switch (config.getChargeFrequency()) {
            case "MONTHLY" -> true;
            case "QUARTERLY" -> accrualDate.getMonthValue() == 3
                    || accrualDate.getMonthValue() == 6
                    || accrualDate.getMonthValue() == 9
                    || accrualDate.getMonthValue() == 12;
            case "ANNUALLY" -> accrualDate.getMonthValue() == 12;
            default -> false;
        };
    }

    private String buildAccrualTriggerRef(IslamicFeeConfiguration config, Account account, LocalDate accrualDate) {
        String periodKey = switch (config.getChargeFrequency()) {
            case "MONTHLY" -> accrualDate.getYear() + "-" + String.format("%02d", accrualDate.getMonthValue());
            case "QUARTERLY" -> accrualDate.getYear() + "-Q" + ((accrualDate.getMonthValue() - 1) / 3 + 1);
            case "ANNUALLY" -> String.valueOf(accrualDate.getYear());
            default -> accrualDate.toString();
        };
        return config.getFeeCode() + ":" + account.getId() + ":" + periodKey;
    }

    private BigDecimal recognisedIncomeAmount(FeeChargeLog logEntry) {
        if ("DEFERRED_RECOGNITION".equals(logEntry.getTriggerEvent())
                || "PERIODIC_ACCRUAL".equals(logEntry.getTriggerEvent())) {
            return IslamicFeeSupport.money(logEntry.getFeeAmount());
        }
        if ("DEFERRED".equals(logEntry.getStatus())
                || (logEntry.getDeferredTotalAmount() != null && logEntry.getDeferredTotalAmount().compareTo(BigDecimal.ZERO) > 0)) {
            return BigDecimal.ZERO.setScale(2);
        }
        if ("CHARGED".equals(logEntry.getStatus()) || "COLLECTED".equals(logEntry.getStatus())) {
            return IslamicFeeSupport.money(logEntry.getFeeAmount());
        }
        return BigDecimal.ZERO.setScale(2);
    }
}
