package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.mudarabah.dto.OpenWakalaAccountRequest;
import com.cbs.mudarabah.dto.WakalaDepositResponse;
import com.cbs.mudarabah.dto.WakalaFeeDistributionResponse;
import com.cbs.mudarabah.entity.PreferredLanguage;
import com.cbs.mudarabah.entity.RiskLevel;
import com.cbs.mudarabah.entity.StatementFrequency;
import com.cbs.mudarabah.entity.WakalaAccountSubType;
import com.cbs.mudarabah.entity.WakalaDepositAccount;
import com.cbs.mudarabah.entity.WakalaType;
import com.cbs.mudarabah.repository.WakalaDepositAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WakalaDepositService {

    private final WakalaDepositAccountRepository wakalaRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CustomerRepository customerRepository;

    private static final String WAKALA_INVESTMENT_GL = "3200-WKL-001";
    private static final String CASH_GL = "1001-000-001";
    private static final String WAKALA_FEE_INCOME_GL = "4200-WKL-001";
    private static final String WAKALA_CUSTOMER_PROFIT_GL = "4100-WKL-002";
    private static final AtomicLong WKL_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    public WakalaDepositResponse openWakalaAccount(OpenWakalaAccountRequest request) {
        if (!request.isLossDisclosureAccepted()) {
            throw new BusinessException("Loss disclosure must be accepted for Wakala accounts", "LOSS_DISCLOSURE_REQUIRED");
        }

        WakalaType wakalaType = WakalaType.valueOf(request.getWakalaType());
        // Validate fee structure
        if (wakalaType == WakalaType.FIXED_FEE && (request.getWakalahFeeAmount() == null || request.getWakalahFeeAmount().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new BusinessException("Fixed fee amount must be positive for FIXED_FEE Wakala", "INVALID_FEE");
        }
        if ((wakalaType == WakalaType.PERCENTAGE_FEE || wakalaType == WakalaType.PERFORMANCE_FEE)
                && (request.getWakalahFeeRate() == null || request.getWakalahFeeRate().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new BusinessException("Fee rate must be positive for " + wakalaType + " Wakala", "INVALID_FEE");
        }

        // Fee cap validation per AAOIFI standards
        if (wakalaType == WakalaType.PERCENTAGE_FEE && request.getWakalahFeeRate() != null) {
            BigDecimal maxFeeRate = new BigDecimal("5.0000"); // 5% annual cap per AAOIFI
            if (request.getWakalahFeeRate().compareTo(maxFeeRate) > 0) {
                throw new BusinessException("Wakala fee rate " + request.getWakalahFeeRate()
                        + "% exceeds maximum of " + maxFeeRate + "% per annum (AAOIFI limit)", "FEE_RATE_EXCEEDS_CAP");
            }
        }
        if (wakalaType == WakalaType.PERFORMANCE_FEE && request.getWakalahFeeRate() != null) {
            BigDecimal maxPerfFee = new BigDecimal("30.0000"); // 30% of profit cap
            if (request.getWakalahFeeRate().compareTo(maxPerfFee) > 0) {
                throw new BusinessException("Wakala performance fee rate " + request.getWakalahFeeRate()
                        + "% exceeds maximum of " + maxPerfFee + "% of profit", "PERFORMANCE_FEE_EXCEEDS_CAP");
            }
        }

        // Validate and load customer
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new BusinessException("Customer not found: " + request.getCustomerId(), "CUSTOMER_NOT_FOUND"));

        // Create base Account
        Account account = Account.builder()
                .accountNumber("WKL" + System.currentTimeMillis() % 10000000000L)
                .accountName("Wakala Investment Deposit")
                .currencyCode(request.getCurrencyCode() != null ? request.getCurrencyCode() : "SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .activatedDate(LocalDate.now())
                .build();
        account.setCustomer(customer);
        account = accountRepository.save(account);

        String contractRef = "WKL-DEP-" + LocalDate.now().getYear() + "-" + String.format("%06d", WKL_SEQ.incrementAndGet());

        WakalaAccountSubType subType = WakalaAccountSubType.valueOf(request.getAccountSubType());
        LocalDate maturityDate = null;
        if (subType == WakalaAccountSubType.TERM_WAKALA && request.getTenorDays() != null) {
            maturityDate = LocalDate.now().plusDays(request.getTenorDays());
        }

        WakalaDepositAccount wakala = WakalaDepositAccount.builder()
                .account(account)
                .contractReference(contractRef)
                .contractSignedDate(LocalDate.now())
                .contractTypeCode("WAKALAH")
                .wakalaType(wakalaType)
                .wakalahFeeRate(request.getWakalahFeeRate())
                .wakalahFeeAmount(request.getWakalahFeeAmount())
                .feeFrequency(request.getFeeFrequency() != null
                        ? StatementFrequency.valueOf(request.getFeeFrequency())
                        : StatementFrequency.ANNUALLY)
                .feeAccrued(BigDecimal.ZERO)
                .totalFeesCharged(BigDecimal.ZERO)
                .investmentMandate(request.getInvestmentMandate())
                .investmentMandateAr(request.getInvestmentMandateAr())
                .riskLevel(request.getRiskLevel() != null ? RiskLevel.valueOf(request.getRiskLevel()) : RiskLevel.MEDIUM)
                .accountSubType(subType)
                .tenorDays(request.getTenorDays())
                .maturityDate(maturityDate)
                .maturityInstruction(request.getMaturityInstruction())
                .poolJoinDate(LocalDate.now())
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .cumulativeFeesDeducted(BigDecimal.ZERO)
                .lossExposure(true)
                .lossDisclosureAccepted(true)
                .bankNegligenceLiability(true)
                .earlyWithdrawalAllowed(true)
                .preferredLanguage(PreferredLanguage.EN)
                .statementFrequency(StatementFrequency.MONTHLY)
                .build();

        wakala = wakalaRepository.save(wakala);

        // Post initial deposit
        if (request.getInitialDeposit() != null && request.getInitialDeposit().compareTo(BigDecimal.ZERO) > 0) {
            accountPostingService.postCreditAgainstGl(account, TransactionType.CREDIT,
                    request.getInitialDeposit(),
                    "Wakala investment deposit opening",
                    TransactionChannel.SYSTEM, contractRef,
                    CASH_GL, "WAKALA", contractRef);
        }

        log.info("Wakala account opened: ref={}, type={}, feeRate={}", contractRef, wakalaType, request.getWakalahFeeRate());
        return toResponse(wakala);
    }

    @Transactional(readOnly = true)
    public WakalaDepositResponse getAccount(Long accountId) {
        WakalaDepositAccount w = wakalaRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Wakala account not found for accountId: " + accountId));
        return toResponse(w);
    }

    @Transactional(readOnly = true)
    public List<WakalaDepositResponse> getCustomerWakalaAccounts(Long customerId) {
        return wakalaRepository.findByCustomerId(customerId).stream()
                .map(this::toResponse).toList();
    }

    public WakalaFeeDistributionResponse calculateFeeAndDistribute(Long accountId, BigDecimal grossProfit,
                                                                     LocalDate periodFrom, LocalDate periodTo) {
        WakalaDepositAccount w = wakalaRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Wakala account not found"));
        Account account = w.getAccount();

        // Handle negative gross profit (loss scenario)
        if (grossProfit.compareTo(BigDecimal.ZERO) < 0) {
            BigDecimal lossAmount = grossProfit.abs();
            BigDecimal customerLoss = grossProfit;

            // Bank negligence liability check: if bank (Wakeel) was negligent, bank bears the loss
            if (w.isBankNegligenceLiability() && w.isBankNegligent()) {
                log.warn("Bank negligence detected for Wakala account {}. Bank (Wakeel) bears the loss of {}.",
                        accountId, lossAmount);
                // Bank bears the loss - do not pass to customer
                customerLoss = BigDecimal.ZERO;
                // Post loss to bank's own account (Wakeel liability)
                accountPostingService.postDebitAgainstGl(account, TransactionType.DEBIT,
                        BigDecimal.ZERO, // no debit to customer
                        "Wakala loss borne by bank due to negligence",
                        TransactionChannel.SYSTEM, null,
                        WAKALA_FEE_INCOME_GL, "WAKALA", w.getContractReference());
            } else {
                log.warn("Negative gross profit {} for Wakala account {}. Loss absorbed by customer as Muwakkil.",
                        grossProfit, accountId);
                // Debit the loss from customer account
                if (lossAmount.compareTo(BigDecimal.ZERO) > 0) {
                    accountPostingService.postDebitAgainstGl(account, TransactionType.DEBIT,
                            lossAmount, "Wakala investment loss",
                            TransactionChannel.SYSTEM, null,
                            WAKALA_INVESTMENT_GL, "WAKALA", w.getContractReference());
                }
            }

            // In a loss scenario, the bank (Wakil) charges no fee
            w.setLastProfitDistributionDate(LocalDate.now());
            wakalaRepository.save(w);

            return WakalaFeeDistributionResponse.builder()
                    .accountId(accountId)
                    .accountNumber(account.getAccountNumber())
                    .grossProfit(grossProfit)
                    .wakalahFee(BigDecimal.ZERO)
                    .customerProfit(customerLoss) // negative = loss passed to customer, zero if bank bears it
                    .effectiveRate(BigDecimal.ZERO)
                    .periodFrom(periodFrom)
                    .periodTo(periodTo)
                    .build();
        }

        BigDecimal wakalahFee;
        switch (w.getWakalaType()) {
            case FIXED_FEE -> {
                // Pro-rate fixed fee for the period
                long periodDays = ChronoUnit.DAYS.between(periodFrom, periodTo);
                wakalahFee = w.getWakalahFeeAmount()
                        .multiply(BigDecimal.valueOf(periodDays))
                        .divide(BigDecimal.valueOf(365), 4, RoundingMode.HALF_UP);
            }
            case PERCENTAGE_FEE -> {
                // Fee = rate% of invested amount
                wakalahFee = account.getBookBalance()
                        .multiply(w.getWakalahFeeRate())
                        .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
                long days = ChronoUnit.DAYS.between(periodFrom, periodTo);
                wakalahFee = wakalahFee.multiply(BigDecimal.valueOf(days))
                        .divide(BigDecimal.valueOf(365), 4, RoundingMode.HALF_UP);
            }
            case PERFORMANCE_FEE -> {
                // Fee = rate% of profit earned
                wakalahFee = grossProfit.multiply(w.getWakalahFeeRate())
                        .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            }
            default -> wakalahFee = BigDecimal.ZERO;
        }

        // Validate fee doesn't exceed gross profit (bank can't charge more than what was earned)
        if (wakalahFee.compareTo(grossProfit) > 0) {
            log.warn("Wakala fee {} exceeds gross profit {} for account {}. Capping fee to gross profit.",
                    wakalahFee, grossProfit, accountId);
            wakalahFee = grossProfit;
        }

        // Customer gets everything above the fee
        BigDecimal customerProfit = grossProfit.subtract(wakalahFee);
        if (customerProfit.compareTo(BigDecimal.ZERO) < 0) {
            customerProfit = BigDecimal.ZERO; // If profit < fee, customer gets nothing, bank gets partial fee
            wakalahFee = grossProfit; // Bank can only take what's available
        }

        // Credit customer profit using customer profit distribution GL
        if (customerProfit.compareTo(BigDecimal.ZERO) > 0) {
            accountPostingService.postCreditAgainstGl(account, TransactionType.CREDIT,
                    customerProfit, "Wakala investment profit",
                    TransactionChannel.SYSTEM, null,
                    WAKALA_CUSTOMER_PROFIT_GL, "WAKALA", w.getContractReference());
        }

        // Post bank's Wakala fee income to GL
        if (wakalahFee.compareTo(BigDecimal.ZERO) > 0) {
            accountPostingService.postDebitAgainstGl(account, TransactionType.DEBIT,
                    wakalahFee, "Wakala fee deduction",
                    TransactionChannel.SYSTEM, null,
                    WAKALA_FEE_INCOME_GL, "WAKALA", w.getContractReference());
        }

        // Update Wakala account
        w.setTotalFeesCharged(w.getTotalFeesCharged().add(wakalahFee));
        w.setCumulativeFeesDeducted(w.getCumulativeFeesDeducted().add(wakalahFee));
        w.setCumulativeProfitReceived(w.getCumulativeProfitReceived().add(customerProfit));
        w.setLastProfitDistributionDate(LocalDate.now());
        wakalaRepository.save(w);

        // Effective rate
        long periodDays = ChronoUnit.DAYS.between(periodFrom, periodTo);
        BigDecimal effectiveRate = BigDecimal.ZERO;
        if (account.getBookBalance().compareTo(BigDecimal.ZERO) > 0 && periodDays > 0) {
            effectiveRate = customerProfit.multiply(BigDecimal.valueOf(365))
                    .divide(account.getBookBalance().multiply(BigDecimal.valueOf(periodDays)), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
        }

        log.info("Wakala fee distribution: account={}, gross={}, fee={}, customer={}", accountId, grossProfit, wakalahFee, customerProfit);

        return WakalaFeeDistributionResponse.builder()
                .accountId(accountId)
                .accountNumber(account.getAccountNumber())
                .grossProfit(grossProfit)
                .wakalahFee(wakalahFee)
                .customerProfit(customerProfit)
                .effectiveRate(effectiveRate)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .build();
    }

    public WakalaDepositResponse withdraw(Long accountId, BigDecimal amount, String narration, String externalRef) {
        WakalaDepositAccount w = wakalaRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Wakala account not found"));
        Account account = w.getAccount();

        if (!account.isActive()) {
            throw new BusinessException("Account is not active", "ACCOUNT_NOT_ACTIVE");
        }
        if (!account.hasSufficientBalance(amount)) {
            throw new BusinessException("Insufficient balance for withdrawal", "INSUFFICIENT_BALANCE");
        }
        if (w.getAccountSubType() == WakalaAccountSubType.TERM_WAKALA) {
            throw new BusinessException("Cannot withdraw from term Wakala before maturity. Use processEarlyWithdrawal() instead.", "TERM_WAKALA_NO_WITHDRAW");
        }

        accountPostingService.postDebitAgainstGl(account, TransactionType.DEBIT,
                amount,
                narration != null ? narration : "Wakala withdrawal",
                TransactionChannel.SYSTEM, externalRef,
                CASH_GL, "WAKALA", w.getContractReference());

        log.info("Wakala withdrawal: accountId={}, amount={}", accountId, amount);
        return toResponse(w);
    }

    public WakalaDepositResponse processMaturity(Long accountId) {
        WakalaDepositAccount w = wakalaRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Wakala account not found"));
        Account account = w.getAccount();

        if (w.getAccountSubType() != WakalaAccountSubType.TERM_WAKALA) {
            throw new BusinessException("Only term Wakala accounts have maturity processing", "NOT_TERM_WAKALA");
        }
        if (w.getMaturityDate() != null && w.getMaturityDate().isAfter(LocalDate.now())) {
            throw new BusinessException("Wakala account has not reached maturity date: " + w.getMaturityDate(), "NOT_YET_MATURED");
        }

        BigDecimal totalBalance = account.getBookBalance();

        // Transfer to payout account or hold based on maturity instruction
        String instruction = w.getMaturityInstruction();
        if ("PAY_TO_ACCOUNT".equals(instruction) && w.getPayoutAccountId() != null) {
            Account payoutAccount = accountRepository.findById(w.getPayoutAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Payout account not found"));
            if (totalBalance.compareTo(BigDecimal.ZERO) > 0) {
                accountPostingService.postTransfer(account, payoutAccount,
                        totalBalance, totalBalance,
                        "Wakala maturity payout " + w.getContractReference(),
                        "Wakala maturity received " + w.getContractReference(),
                        TransactionChannel.SYSTEM, w.getContractReference() + ":MAT",
                        "WAKALA", w.getContractReference());
            }
            account.setStatus(AccountStatus.CLOSED);
            accountRepository.save(account);
        } else {
            // Hold pending instruction
            log.info("Wakala maturity: holding balance pending instruction for account {}", accountId);
        }

        w.setMaturedAt(LocalDate.now());
        wakalaRepository.save(w);

        log.info("Wakala maturity processed: accountId={}, balance={}, instruction={}", accountId, totalBalance, instruction);
        return toResponse(w);
    }

    public WakalaDepositResponse processEarlyWithdrawal(Long accountId, String reason) {
        WakalaDepositAccount w = wakalaRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Wakala account not found"));
        Account account = w.getAccount();

        if (!account.isActive()) {
            throw new BusinessException("Account is not active", "ACCOUNT_NOT_ACTIVE");
        }
        if (!w.isEarlyWithdrawalAllowed()) {
            throw new BusinessException("Early withdrawal is not allowed for this Wakala account", "EARLY_WITHDRAWAL_NOT_ALLOWED");
        }

        BigDecimal totalBalance = account.getBookBalance();
        BigDecimal payoutAmount = totalBalance;

        // For early withdrawal, customer may forfeit accrued profit
        BigDecimal accruedFee = w.getFeeAccrued() != null ? w.getFeeAccrued() : BigDecimal.ZERO;
        if (accruedFee.compareTo(BigDecimal.ZERO) > 0 && payoutAmount.compareTo(accruedFee) > 0) {
            // Deduct any outstanding Wakala fees
            payoutAmount = payoutAmount.subtract(accruedFee);
            log.info("Early withdrawal: deducting accrued fee {} from Wakala account {}", accruedFee, accountId);
        }

        // Transfer to payout account
        if (w.getPayoutAccountId() != null && payoutAmount.compareTo(BigDecimal.ZERO) > 0) {
            Account payoutAccount = accountRepository.findById(w.getPayoutAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Payout account not found"));
            accountPostingService.postTransfer(account, payoutAccount,
                    payoutAmount, payoutAmount,
                    "Wakala early withdrawal " + w.getContractReference(),
                    "Wakala early withdrawal received " + w.getContractReference(),
                    TransactionChannel.SYSTEM, w.getContractReference() + ":EW",
                    "WAKALA", w.getContractReference());
        }

        w.setEarlyWithdrawnAt(LocalDate.now());
        w.setEarlyWithdrawalReason(reason);
        account.setStatus(AccountStatus.CLOSED);
        accountRepository.save(account);
        wakalaRepository.save(w);

        log.info("Wakala early withdrawal processed: accountId={}, amount={}, reason={}", accountId, payoutAmount, reason);
        return toResponse(w);
    }

    private WakalaDepositResponse toResponse(WakalaDepositAccount w) {
        Account account = w.getAccount();
        return WakalaDepositResponse.builder()
                .id(w.getId())
                .accountId(account.getId())
                .accountNumber(account.getAccountNumber())
                .contractReference(w.getContractReference())
                .contractSignedDate(w.getContractSignedDate())
                .contractTypeCode(w.getContractTypeCode())
                .wakalaType(w.getWakalaType().name())
                .wakalahFeeRate(w.getWakalahFeeRate())
                .wakalahFeeAmount(w.getWakalahFeeAmount())
                .feeFrequency(w.getFeeFrequency() != null ? w.getFeeFrequency().name() : null)
                .feeAccrued(w.getFeeAccrued())
                .totalFeesCharged(w.getTotalFeesCharged())
                .investmentMandate(w.getInvestmentMandate())
                .investmentMandateAr(w.getInvestmentMandateAr())
                .targetReturnRate(w.getTargetReturnRate())
                .expectedProfitRate(w.getExpectedProfitRate())
                .riskLevel(w.getRiskLevel() != null ? w.getRiskLevel().name() : null)
                .accountSubType(w.getAccountSubType().name())
                .tenorDays(w.getTenorDays())
                .maturityDate(w.getMaturityDate())
                .maturityInstruction(w.getMaturityInstruction())
                .investmentPoolId(w.getInvestmentPoolId())
                .poolJoinDate(w.getPoolJoinDate())
                .lastProfitDistributionDate(w.getLastProfitDistributionDate())
                .cumulativeProfitReceived(w.getCumulativeProfitReceived())
                .cumulativeFeesDeducted(w.getCumulativeFeesDeducted())
                .lossExposure(w.isLossExposure())
                .lossDisclosureAccepted(w.isLossDisclosureAccepted())
                .bankNegligenceLiability(w.isBankNegligenceLiability())
                .earlyWithdrawalAllowed(w.isEarlyWithdrawalAllowed())
                .bookBalance(account.getBookBalance())
                .availableBalance(account.getAvailableBalance())
                .status(account.getStatus() != null ? account.getStatus().name() : null)
                .openedDate(account.getOpenedDate())
                .build();
    }
}
