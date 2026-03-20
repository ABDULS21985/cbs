package com.cbs.deposit.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.deposit.dto.*;
import com.cbs.deposit.entity.*;
import com.cbs.deposit.repository.FixedDepositRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.provider.interest.DayCountEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FixedDepositService {

    private final FixedDepositRepository fdRepository;
    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;
    private final AccountPostingService accountPostingService;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;
    private final DayCountEngine dayCountEngine;
    private final CbsProperties cbsProperties;

    @Transactional
    public FixedDepositResponse bookDeposit(CreateFixedDepositRequest request) {
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()));

        Product product = productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        Customer customer = account.getCustomer();

        // Validate sufficient balance if funding from account
        if (account.getAvailableBalance().compareTo(request.getPrincipalAmount()) < 0) {
            throw new BusinessException("Insufficient balance to fund fixed deposit", "INSUFFICIENT_BALANCE");
        }

        LocalDate startDate = LocalDate.now();
        LocalDate maturityDate = startDate.plusDays(request.getTenureDays());
        String convention = request.getDayCountConvention() != null ?
                request.getDayCountConvention() : cbsProperties.getInterest().getDayCountConvention();

        Long seq = fdRepository.getNextDepositSequence();
        String depositNumber = String.format("FD%012d", seq);

        FixedDeposit fd = FixedDeposit.builder()
                .depositNumber(depositNumber)
                .account(account)
                .customer(customer)
                .product(product)
                .currencyCode(account.getCurrencyCode())
                .principalAmount(request.getPrincipalAmount())
                .currentValue(request.getPrincipalAmount())
                .interestRate(request.getInterestRate())
                .dayCountConvention(convention)
                .compoundingFrequency(request.getCompoundingFrequency() != null ?
                        request.getCompoundingFrequency() : "NONE")
                .tenureDays(request.getTenureDays())
                .tenureMonths(request.getTenureMonths())
                .startDate(startDate)
                .maturityDate(maturityDate)
                .maturityAction(request.getMaturityAction() != null ?
                        request.getMaturityAction() : MaturityAction.CREDIT_ACCOUNT)
                .maxRollovers(request.getMaxRollovers())
                .allowsEarlyTermination(request.getAllowsEarlyTermination() != null ?
                        request.getAllowsEarlyTermination() : true)
                .earlyTerminationPenaltyType(request.getEarlyTerminationPenaltyType() != null ?
                        request.getEarlyTerminationPenaltyType() : PenaltyType.RATE_REDUCTION)
                .earlyTerminationPenaltyValue(request.getEarlyTerminationPenaltyValue() != null ?
                        request.getEarlyTerminationPenaltyValue() : BigDecimal.ZERO)
                .allowsPartialLiquidation(request.getAllowsPartialLiquidation() != null ?
                        request.getAllowsPartialLiquidation() : false)
                .minPartialAmount(request.getMinPartialAmount())
                .minRemainingBalance(request.getMinRemainingBalance())
                .status(FixedDepositStatus.ACTIVE)
                .fundingAccount(account)
                .build();

        if (request.getPayoutAccountId() != null) {
            Account payoutAccount = accountRepository.findById(request.getPayoutAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getPayoutAccountId()));
            fd.setPayoutAccount(payoutAccount);
        }

        FixedDeposit saved = fdRepository.save(fd);
        accountPostingService.postDebitAgainstGl(
                account,
                com.cbs.account.entity.TransactionType.DEBIT,
                request.getPrincipalAmount(),
                "Fixed deposit funding " + depositNumber,
                TransactionChannel.SYSTEM,
                depositNumber,
                requiredProductGl(product),
                "FIXED_DEPOSIT",
                depositNumber
        );
        log.info("Fixed deposit booked: number={}, principal={}, rate={}%, tenure={}d, maturity={}",
                depositNumber, request.getPrincipalAmount(), request.getInterestRate(),
                request.getTenureDays(), maturityDate);

        return toResponse(saved);
    }

    public FixedDepositResponse getDeposit(Long id) {
        FixedDeposit fd = fdRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("FixedDeposit", "id", id));
        return toResponse(fd);
    }

    public FixedDepositResponse getDepositByNumber(String depositNumber) {
        FixedDeposit fd = fdRepository.findByDepositNumber(depositNumber)
                .orElseThrow(() -> new ResourceNotFoundException("FixedDeposit", "depositNumber", depositNumber));
        return toResponse(fd);
    }

    public Page<FixedDepositResponse> getCustomerDeposits(Long customerId, Pageable pageable) {
        return fdRepository.findByCustomerId(customerId, pageable).map(this::toResponse);
    }

    @Transactional
    public BigDecimal accrueInterest(Long depositId) {
        FixedDeposit fd = fdRepository.findById(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("FixedDeposit", "id", depositId));

        if (!fd.isActive()) return BigDecimal.ZERO;

        BigDecimal dailyInterest = dayCountEngine.calculateDailyAccrual(
                fd.getCurrentValue(), fd.getInterestRate(), LocalDate.now());

        fd.setAccruedInterest(fd.getAccruedInterest().add(dailyInterest));
        fd.setCurrentValue(fd.getPrincipalAmount().add(fd.getAccruedInterest()
                .setScale(2, RoundingMode.HALF_UP)));
        fdRepository.save(fd);

        return dailyInterest;
    }

    @Transactional
    public int batchAccrueInterest() {
        List<FixedDeposit> activeDeposits = fdRepository.findAllActive();
        int count = 0;
        for (FixedDeposit fd : activeDeposits) {
            try {
                accrueInterest(fd.getId());
                count++;
            } catch (Exception e) {
                log.error("FD interest accrual failed for {}: {}", fd.getDepositNumber(), e.getMessage());
            }
        }
        log.info("FD batch accrual complete: {} deposits processed", count);
        return count;
    }

    @Transactional
    public int processMaturedDeposits() {
        List<FixedDeposit> matured = fdRepository.findMaturedDeposits(LocalDate.now());
        int count = 0;
        for (FixedDeposit fd : matured) {
            try {
                processMaturity(fd);
                count++;
            } catch (Exception e) {
                log.error("FD maturity processing failed for {}: {}", fd.getDepositNumber(), e.getMessage());
            }
        }
        log.info("FD maturity processing complete: {} deposits processed", count);
        return count;
    }

    private void processMaturity(FixedDeposit fd) {
        BigDecimal totalPayout = fd.getCurrentValue();
        BigDecimal interestEarned = fd.getAccruedInterest().setScale(2, RoundingMode.HALF_UP);

        fd.setTotalInterestEarned(fd.getTotalInterestEarned().add(interestEarned));
        fd.setAccruedInterest(BigDecimal.ZERO);

        switch (fd.getMaturityAction()) {
            case CREDIT_ACCOUNT -> {
                Account payoutAccount = fd.getPayoutAccount() != null ? fd.getPayoutAccount() : fd.getAccount();
                accountPostingService.postCreditAgainstGl(
                        payoutAccount,
                        com.cbs.account.entity.TransactionType.CREDIT,
                        totalPayout,
                        "Fixed deposit maturity payout " + fd.getDepositNumber(),
                        TransactionChannel.SYSTEM,
                        fd.getDepositNumber() + ":MATURITY",
                        maturityPayoutLegs(fd, interestEarned),
                        "FIXED_DEPOSIT",
                        fd.getDepositNumber()
                );
                settlePaidOutDeposit(fd);
                fd.setStatus(FixedDepositStatus.MATURED);
                fd.setClosedDate(LocalDate.now());
                log.info("FD {} matured: {} credited to account {}", fd.getDepositNumber(), totalPayout, payoutAccount.getAccountNumber());
            }
            case ROLLOVER_PRINCIPAL -> {
                if (fd.getMaxRollovers() != null && fd.getRolloverCount() >= fd.getMaxRollovers()) {
                    Account payoutAccount = fd.getPayoutAccount() != null ? fd.getPayoutAccount() : fd.getAccount();
                    accountPostingService.postCreditAgainstGl(
                            payoutAccount,
                            com.cbs.account.entity.TransactionType.CREDIT,
                            totalPayout,
                            "Fixed deposit maturity payout " + fd.getDepositNumber(),
                            TransactionChannel.SYSTEM,
                            fd.getDepositNumber() + ":MATURITY",
                            maturityPayoutLegs(fd, interestEarned),
                            "FIXED_DEPOSIT",
                            fd.getDepositNumber()
                    );
                    settlePaidOutDeposit(fd);
                    fd.setStatus(FixedDepositStatus.MATURED);
                    fd.setClosedDate(LocalDate.now());
                } else {
                    Account payoutAccount = fd.getPayoutAccount() != null ? fd.getPayoutAccount() : fd.getAccount();
                    accountPostingService.postCreditAgainstGl(
                            payoutAccount,
                            com.cbs.account.entity.TransactionType.CREDIT,
                            interestEarned,
                            "Fixed deposit interest payout " + fd.getDepositNumber(),
                            TransactionChannel.SYSTEM,
                            fd.getDepositNumber() + ":ROLLOVER",
                            requiredInterestExpenseGl(fd.getProduct()),
                            "FIXED_DEPOSIT",
                            fd.getDepositNumber()
                    );
                    fd.setPrincipalAmount(fd.getPrincipalAmount().setScale(2, RoundingMode.HALF_UP));
                    fd.setStartDate(LocalDate.now());
                    fd.setMaturityDate(LocalDate.now().plusDays(fd.getTenureDays()));
                    fd.setCurrentValue(fd.getPrincipalAmount());
                    fd.setRolloverCount(fd.getRolloverCount() + 1);
                    fd.setStatus(FixedDepositStatus.ACTIVE);
                    log.info("FD {} rolled over (principal only), interest {} credited", fd.getDepositNumber(), interestEarned);
                }
            }
            case ROLLOVER_PRINCIPAL_INTEREST -> {
                if (fd.getMaxRollovers() != null && fd.getRolloverCount() >= fd.getMaxRollovers()) {
                    Account payoutAccount = fd.getPayoutAccount() != null ? fd.getPayoutAccount() : fd.getAccount();
                    accountPostingService.postCreditAgainstGl(
                            payoutAccount,
                            com.cbs.account.entity.TransactionType.CREDIT,
                            totalPayout,
                            "Fixed deposit maturity payout " + fd.getDepositNumber(),
                            TransactionChannel.SYSTEM,
                            fd.getDepositNumber() + ":MATURITY",
                            maturityPayoutLegs(fd, interestEarned),
                            "FIXED_DEPOSIT",
                            fd.getDepositNumber()
                    );
                    settlePaidOutDeposit(fd);
                    fd.setStatus(FixedDepositStatus.MATURED);
                    fd.setClosedDate(LocalDate.now());
                } else {
                    if (interestEarned.compareTo(BigDecimal.ZERO) > 0) {
                        generalLedgerExpenseToControl(fd, interestEarned, "Fixed deposit rollover capitalization " + fd.getDepositNumber());
                    }
                    fd.setPrincipalAmount(totalPayout);
                    fd.setCurrentValue(totalPayout);
                    fd.setStartDate(LocalDate.now());
                    fd.setMaturityDate(LocalDate.now().plusDays(fd.getTenureDays()));
                    fd.setRolloverCount(fd.getRolloverCount() + 1);
                    fd.setStatus(FixedDepositStatus.ACTIVE);
                    log.info("FD {} rolled over (P+I), new principal={}", fd.getDepositNumber(), totalPayout);
                }
            }
            case HOLD -> {
                fd.setStatus(FixedDepositStatus.MATURED);
                log.info("FD {} matured, held for customer instruction", fd.getDepositNumber());
            }
            default -> {
                fd.setStatus(FixedDepositStatus.MATURED);
            }
        }
        fdRepository.save(fd);
    }

    @Transactional
    public FixedDepositResponse earlyTerminate(Long depositId, String reason) {
        FixedDeposit fd = fdRepository.findByIdWithDetails(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("FixedDeposit", "id", depositId));

        if (!fd.isActive()) {
            throw new BusinessException("Deposit is not active", "DEPOSIT_NOT_ACTIVE");
        }
        if (!Boolean.TRUE.equals(fd.getAllowsEarlyTermination())) {
            throw new BusinessException("Early termination is not allowed for this deposit", "EARLY_TERMINATION_NOT_ALLOWED");
        }

        BigDecimal penaltyAmount = calculatePenalty(fd);
        BigDecimal payout = fd.getCurrentValue().subtract(penaltyAmount);
        if (payout.compareTo(BigDecimal.ZERO) < 0) payout = BigDecimal.ZERO;

        Account payoutAccount = fd.getPayoutAccount() != null ? fd.getPayoutAccount() : fd.getAccount();
        accountPostingService.postCreditAgainstGl(
                payoutAccount,
                com.cbs.account.entity.TransactionType.CREDIT,
                payout,
                "Fixed deposit early termination " + fd.getDepositNumber(),
                TransactionChannel.SYSTEM,
                fd.getDepositNumber() + ":BREAK",
                earlyTerminationLegs(fd, penaltyAmount),
                "FIXED_DEPOSIT",
                fd.getDepositNumber()
        );

        fd.setStatus(FixedDepositStatus.BROKEN);
        fd.setBrokenDate(LocalDate.now());
        fd.setClosedDate(LocalDate.now());
        settlePaidOutDeposit(fd);
        fd.setTotalInterestEarned(fd.getTotalInterestEarned().add(
                fd.getAccruedInterest().setScale(2, RoundingMode.HALF_UP)));
        fd.setAccruedInterest(BigDecimal.ZERO);
        fdRepository.save(fd);

        log.info("FD {} early terminated: payout={}, penalty={}, reason={}",
                fd.getDepositNumber(), payout, penaltyAmount, reason);
        return toResponse(fd);
    }

    @Transactional
    public FixedDepositResponse partialLiquidate(Long depositId, BigDecimal amount) {
        FixedDeposit fd = fdRepository.findByIdWithDetails(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("FixedDeposit", "id", depositId));

        if (!fd.isActive()) throw new BusinessException("Deposit is not active", "DEPOSIT_NOT_ACTIVE");
        if (!Boolean.TRUE.equals(fd.getAllowsPartialLiquidation()))
            throw new BusinessException("Partial liquidation not allowed", "PARTIAL_LIQUIDATION_NOT_ALLOWED");
        if (fd.getMinPartialAmount() != null && amount.compareTo(fd.getMinPartialAmount()) < 0)
            throw new BusinessException("Amount below minimum partial liquidation amount", "BELOW_MIN_PARTIAL");

        BigDecimal remaining = fd.getPrincipalAmount().subtract(amount);
        if (fd.getMinRemainingBalance() != null && remaining.compareTo(fd.getMinRemainingBalance()) < 0)
            throw new BusinessException("Remaining balance would fall below minimum", "BELOW_MIN_REMAINING");

        Account payoutAccount = fd.getPayoutAccount() != null ? fd.getPayoutAccount() : fd.getAccount();
        accountPostingService.postCreditAgainstGl(
                payoutAccount,
                com.cbs.account.entity.TransactionType.CREDIT,
                amount,
                "Fixed deposit partial liquidation " + fd.getDepositNumber(),
                TransactionChannel.SYSTEM,
                fd.getDepositNumber() + ":PARTIAL",
                requiredProductGl(fd.getProduct()),
                "FIXED_DEPOSIT",
                fd.getDepositNumber()
        );

        fd.setPrincipalAmount(remaining);
        fd.setCurrentValue(remaining.add(fd.getAccruedInterest().setScale(2, RoundingMode.HALF_UP)));
        fdRepository.save(fd);

        log.info("FD {} partial liquidation: amount={}, remaining={}", fd.getDepositNumber(), amount, remaining);
        return toResponse(fd);
    }

    private BigDecimal calculatePenalty(FixedDeposit fd) {
        if (fd.getEarlyTerminationPenaltyType() == PenaltyType.NONE) return BigDecimal.ZERO;
        BigDecimal penaltyValue = fd.getEarlyTerminationPenaltyValue();
        return switch (fd.getEarlyTerminationPenaltyType()) {
            case FLAT_FEE -> penaltyValue;
            case PERCENTAGE -> fd.getAccruedInterest()
                    .multiply(penaltyValue)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case RATE_REDUCTION -> {
                BigDecimal reducedRate = fd.getInterestRate().subtract(penaltyValue);
                if (reducedRate.compareTo(BigDecimal.ZERO) < 0) reducedRate = BigDecimal.ZERO;
                BigDecimal actualInterest = dayCountEngine.calculatePeriodInterest(
                        fd.getPrincipalAmount(), reducedRate, fd.getStartDate(), LocalDate.now());
                BigDecimal interestDiff = fd.getAccruedInterest()
                        .setScale(2, RoundingMode.HALF_UP)
                        .subtract(actualInterest.setScale(2, RoundingMode.HALF_UP));
                yield interestDiff.max(BigDecimal.ZERO);
            }
            default -> BigDecimal.ZERO;
        };
    }

    private void settlePaidOutDeposit(FixedDeposit fd) {
        fd.setPrincipalAmount(BigDecimal.ZERO);
        fd.setCurrentValue(BigDecimal.ZERO);
    }

    private FixedDepositResponse toResponse(FixedDeposit fd) {
        return FixedDepositResponse.builder()
                .id(fd.getId())
                .depositNumber(fd.getDepositNumber())
                .accountId(fd.getAccount().getId())
                .accountNumber(fd.getAccount().getAccountNumber())
                .customerId(fd.getCustomer().getId())
                .customerDisplayName(fd.getCustomer().getDisplayName())
                .productCode(fd.getProduct().getCode())
                .productName(fd.getProduct().getName())
                .currencyCode(fd.getCurrencyCode())
                .principalAmount(fd.getPrincipalAmount())
                .currentValue(fd.getCurrentValue())
                .accruedInterest(fd.getAccruedInterest())
                .totalInterestEarned(fd.getTotalInterestEarned())
                .interestRate(fd.getInterestRate())
                .effectiveRate(fd.getEffectiveRate())
                .dayCountConvention(fd.getDayCountConvention())
                .compoundingFrequency(fd.getCompoundingFrequency())
                .tenureDays(fd.getTenureDays())
                .tenureMonths(fd.getTenureMonths())
                .startDate(fd.getStartDate())
                .maturityDate(fd.getMaturityDate())
                .daysElapsed(fd.daysElapsed())
                .daysRemaining(fd.daysRemaining())
                .maturityAction(fd.getMaturityAction())
                .rolloverCount(fd.getRolloverCount())
                .maxRollovers(fd.getMaxRollovers())
                .allowsEarlyTermination(fd.getAllowsEarlyTermination())
                .earlyTerminationPenaltyType(fd.getEarlyTerminationPenaltyType())
                .earlyTerminationPenaltyValue(fd.getEarlyTerminationPenaltyValue())
                .allowsPartialLiquidation(fd.getAllowsPartialLiquidation())
                .status(fd.getStatus())
                .brokenDate(fd.getBrokenDate())
                .closedDate(fd.getClosedDate())
                .createdAt(fd.getCreatedAt())
                .build();
    }

    private List<AccountPostingService.GlPostingLeg> maturityPayoutLegs(FixedDeposit fd, BigDecimal interestEarned) {
        List<AccountPostingService.GlPostingLeg> legs = new java.util.ArrayList<>();
        BigDecimal principalComponent = fd.getPrincipalAmount().setScale(2, RoundingMode.HALF_UP);
        if (principalComponent.compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requiredProductGl(fd.getProduct()),
                    AccountPostingService.EntrySide.DEBIT,
                    principalComponent,
                    fd.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fixed deposit principal release",
                    null,
                    fd.getCustomer() != null ? fd.getCustomer().getId() : null
            ));
        }
        if (interestEarned.compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requiredInterestExpenseGl(fd.getProduct()),
                    AccountPostingService.EntrySide.DEBIT,
                    interestEarned,
                    fd.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fixed deposit interest expense",
                    null,
                    fd.getCustomer() != null ? fd.getCustomer().getId() : null
            ));
        }
        return legs;
    }

    private List<AccountPostingService.GlPostingLeg> earlyTerminationLegs(FixedDeposit fd, BigDecimal penaltyAmount) {
        List<AccountPostingService.GlPostingLeg> legs = new java.util.ArrayList<>();
        BigDecimal principalComponent = fd.getPrincipalAmount().setScale(2, RoundingMode.HALF_UP);
        if (principalComponent.compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requiredProductGl(fd.getProduct()),
                    AccountPostingService.EntrySide.DEBIT,
                    principalComponent,
                    fd.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fixed deposit principal release",
                    null,
                    fd.getCustomer() != null ? fd.getCustomer().getId() : null
            ));
        }
        BigDecimal netInterestExpense = fd.getAccruedInterest()
                .setScale(2, RoundingMode.HALF_UP)
                .subtract(penaltyAmount)
                .max(BigDecimal.ZERO);
        if (netInterestExpense.compareTo(BigDecimal.ZERO) > 0) {
            legs.add(accountPostingService.balanceLeg(
                    requiredInterestExpenseGl(fd.getProduct()),
                    AccountPostingService.EntrySide.DEBIT,
                    netInterestExpense,
                    fd.getCurrencyCode(),
                    BigDecimal.ONE,
                    "Fixed deposit interest expense",
                    null,
                    fd.getCustomer() != null ? fd.getCustomer().getId() : null
            ));
        }
        return legs;
    }

    private void generalLedgerExpenseToControl(FixedDeposit fd, BigDecimal amount, String description) {
        generalLedgerService.postJournal(
                "SYSTEM",
                description,
                "FIXED_DEPOSIT",
                fd.getDepositNumber(),
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                List.of(
                        new com.cbs.gl.service.GeneralLedgerService.JournalLineRequest(
                                requiredInterestExpenseGl(fd.getProduct()),
                                amount,
                                BigDecimal.ZERO,
                                fd.getCurrencyCode(),
                                BigDecimal.ONE,
                                description,
                                null,
                                branchCode(fd.getAccount()),
                                fd.getAccount() != null ? fd.getAccount().getId() : null,
                                fd.getCustomer() != null ? fd.getCustomer().getId() : null
                        ),
                        new com.cbs.gl.service.GeneralLedgerService.JournalLineRequest(
                                requiredProductGl(fd.getProduct()),
                                BigDecimal.ZERO,
                                amount,
                                fd.getCurrencyCode(),
                                BigDecimal.ONE,
                                description,
                                null,
                                branchCode(fd.getAccount()),
                                fd.getAccount() != null ? fd.getAccount().getId() : null,
                                fd.getCustomer() != null ? fd.getCustomer().getId() : null
                        )
                )
        );
    }

    private String requiredProductGl(Product product) {
        if (product == null || !StringUtils.hasText(product.getGlAccountCode())) {
            throw new BusinessException("Deposit product GL account code is required", "MISSING_DEPOSIT_PRODUCT_GL");
        }
        return product.getGlAccountCode();
    }

    private String requiredInterestExpenseGl(Product product) {
        if (product == null || !StringUtils.hasText(product.getGlInterestExpenseCode())) {
            throw new BusinessException("Deposit product interest expense GL is required", "MISSING_DEPOSIT_INTEREST_GL");
        }
        return product.getGlInterestExpenseCode();
    }

    private String branchCode(Account account) {
        if (account != null && StringUtils.hasText(account.getBranchCode())) {
            return account.getBranchCode();
        }
        return cbsProperties.getLedger().getDefaultBranchCode();
    }
}
