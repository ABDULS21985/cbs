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
import com.cbs.mudarabah.dto.MudarabahAccountResponse;
import com.cbs.mudarabah.dto.MudarabahDepositRequest;
import com.cbs.mudarabah.dto.MudarabahPortfolioSummary;
import com.cbs.mudarabah.dto.MudarabahWithdrawalRequest;
import com.cbs.mudarabah.dto.OpenMudarabahSavingsRequest;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.entity.PreferredLanguage;
import com.cbs.mudarabah.entity.StatementFrequency;
import com.cbs.mudarabah.entity.WeightageMethod;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MudarabahAccountService {

    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final DecisionTableEvaluator decisionTableEvaluator;
    private final InvestmentPoolRepository investmentPoolRepository;

    // GL codes for Mudarabah
    private static final String MUDARABAH_INVESTMENT_GL = "3100-MDR-001";
    private static final String CASH_GL = "1001-000-001";

    // Contract reference counter (simple approach)
    private static final AtomicLong CONTRACT_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    public MudarabahAccountResponse openMudarabahSavingsAccount(OpenMudarabahSavingsRequest request) {
        // 1. Validate loss disclosure accepted
        if (!request.isLossDisclosureAccepted()) {
            throw new BusinessException("Loss disclosure must be accepted for Mudarabah accounts", "LOSS_DISCLOSURE_REQUIRED");
        }

        // 2. Resolve PSR
        BigDecimal psrCustomer = request.getProfitSharingRatioCustomer();
        BigDecimal psrBank = request.getProfitSharingRatioBank();
        if (psrCustomer == null || psrBank == null) {
            // Use default 70:30
            psrCustomer = new BigDecimal("70.0000");
            psrBank = new BigDecimal("30.0000");
        }

        // 3. Validate PSR
        validatePsr(psrCustomer, psrBank);

        // 4. Validate RESTRICTED has restriction details
        if (request.getMudarabahType() == MudarabahType.RESTRICTED
                && (request.getRestrictionDetails() == null || request.getRestrictionDetails().isBlank())) {
            throw new BusinessException("Restriction details required for RESTRICTED Mudarabah", "RESTRICTION_DETAILS_REQUIRED");
        }

        // 5. Find or create base Account (assume customer already has an account or we create one)
        // For this implementation, we expect the customer to have a base account already created
        // We'll look up the customer's accounts or create a minimal account
        Account account = Account.builder()
                .accountNumber(generateAccountNumber())
                .accountName("Mudarabah Savings - " + request.getCustomerId())
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
        // Set customer by ID
        // account.setCustomer(customerRef); — in real impl, load Customer entity
        account = accountRepository.save(account);

        // 6. Create MudarabahAccount extension
        String contractRef = "MDR-SAV-" + LocalDate.now().getYear() + "-" + String.format("%06d", CONTRACT_SEQ.incrementAndGet());

        MudarabahAccount mudarabahAccount = MudarabahAccount.builder()
                .account(account)
                .contractReference(contractRef)
                .contractSignedDate(LocalDate.now())
                .contractVersion(1)
                .contractTypeCode("MUDARABAH")
                .mudarabahType(request.getMudarabahType())
                .restrictionDetails(request.getRestrictionDetails())
                .accountSubType(MudarabahAccountSubType.SAVINGS)
                .profitSharingRatioCustomer(psrCustomer)
                .profitSharingRatioBank(psrBank)
                .psrAgreedAt(LocalDateTime.now())
                .psrAgreedVersion(1)
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .profitReinvest(request.isProfitReinvest())
                .profitDistributionAccountId(request.getProfitDistributionAccountId())
                .lossExposure(true)
                .lossDisclosureAccepted(true)
                .lossDisclosureDate(LocalDate.now())
                .zakatApplicable(true)
                .earlyWithdrawalAllowed(true)
                .lastActivityDate(LocalDate.now())
                .preferredLanguage(PreferredLanguage.EN)
                .statementFrequency(StatementFrequency.MONTHLY)
                .poolJoinDate(LocalDate.now())
                .rolloverCount(0)
                .build();

        mudarabahAccount = mudarabahAccountRepository.save(mudarabahAccount);

        // 7. Post initial deposit if > 0
        if (request.getInitialDeposit() != null && request.getInitialDeposit().compareTo(BigDecimal.ZERO) > 0) {
            accountPostingService.postCreditAgainstGl(
                    account,
                    TransactionType.CREDIT,
                    request.getInitialDeposit(),
                    "Mudarabah savings account opening deposit",
                    TransactionChannel.SYSTEM,
                    contractRef,
                    CASH_GL,
                    "MUDARABAH",
                    contractRef
            );
        }

        log.info("Mudarabah savings account opened: contractRef={}, accountId={}, PSR={}:{}",
                contractRef, account.getId(), psrCustomer, psrBank);

        return toResponse(mudarabahAccount);
    }

    @Transactional(readOnly = true)
    public MudarabahAccountResponse getMudarabahAccount(Long accountId) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found for accountId: " + accountId));
        return toResponse(ma);
    }

    @Transactional(readOnly = true)
    public MudarabahAccountResponse getByAccountNumber(String accountNumber) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found for accountNumber: " + accountNumber));
        return toResponse(ma);
    }

    @Transactional(readOnly = true)
    public MudarabahAccountResponse getByContractReference(String contractRef) {
        MudarabahAccount ma = mudarabahAccountRepository.findByContractReference(contractRef)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found: " + contractRef));
        return toResponse(ma);
    }

    @Transactional(readOnly = true)
    public List<MudarabahAccountResponse> getCustomerMudarabahAccounts(Long customerId) {
        return mudarabahAccountRepository.findByCustomerId(customerId).stream()
                .map(this::toResponse)
                .toList();
    }

    public MudarabahAccountResponse deposit(Long accountId, MudarabahDepositRequest request) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found for accountId: " + accountId));
        Account account = ma.getAccount();

        if (!account.isActive()) {
            throw new BusinessException("Account is not active", "ACCOUNT_NOT_ACTIVE");
        }

        TransactionChannel channel = request.getChannel() != null
                ? TransactionChannel.valueOf(request.getChannel())
                : TransactionChannel.SYSTEM;

        accountPostingService.postCreditAgainstGl(
                account,
                TransactionType.CREDIT,
                request.getAmount(),
                request.getNarration() != null ? request.getNarration() : "Mudarabah deposit",
                channel,
                request.getExternalRef(),
                CASH_GL,
                "MUDARABAH",
                ma.getContractReference()
        );

        ma.setLastActivityDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);

        log.info("Mudarabah deposit: accountId={}, amount={}", accountId, request.getAmount());
        return toResponse(ma);
    }

    public MudarabahAccountResponse withdraw(Long accountId, MudarabahWithdrawalRequest request) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found for accountId: " + accountId));
        Account account = ma.getAccount();

        if (!account.isActive()) {
            throw new BusinessException("Account is not active", "ACCOUNT_NOT_ACTIVE");
        }
        if (!account.hasSufficientBalance(request.getAmount())) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }
        // For NOTICE_DEPOSIT, validate notice period (simplified)
        if (ma.getAccountSubType() == MudarabahAccountSubType.NOTICE_DEPOSIT && ma.getNoticePeriodDays() != null) {
            // In full impl, check if notice was served
            log.warn("Notice deposit withdrawal - notice period validation should be checked");
        }

        TransactionChannel channel = request.getChannel() != null
                ? TransactionChannel.valueOf(request.getChannel())
                : TransactionChannel.SYSTEM;

        accountPostingService.postDebitAgainstGl(
                account,
                TransactionType.DEBIT,
                request.getAmount(),
                request.getNarration() != null ? request.getNarration() : "Mudarabah withdrawal",
                channel,
                request.getExternalRef(),
                CASH_GL,
                "MUDARABAH",
                ma.getContractReference()
        );

        ma.setLastActivityDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);

        log.info("Mudarabah withdrawal: accountId={}, amount={}", accountId, request.getAmount());
        return toResponse(ma);
    }

    public void assignToPool(Long accountId, Long poolId) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));
        ma.setInvestmentPoolId(poolId);
        ma.setPoolJoinDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);
        log.info("Mudarabah account {} assigned to pool {}", accountId, poolId);
    }

    public void changePool(Long accountId, Long newPoolId, String reason) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));
        Long oldPoolId = ma.getInvestmentPoolId();
        ma.setInvestmentPoolId(newPoolId);
        ma.setPoolJoinDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);
        log.info("Mudarabah account {} moved from pool {} to pool {}. Reason: {}", accountId, oldPoolId, newPoolId, reason);
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateCurrentWeight(Long accountId) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));
        if (ma.getInvestmentPoolId() == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal poolTotal = mudarabahAccountRepository.sumBalanceByPoolId(ma.getInvestmentPoolId());
        if (poolTotal.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal accountBalance = ma.getAccount().getBookBalance();
        return accountBalance.multiply(new BigDecimal("100"))
                .divide(poolTotal, 8, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public MudarabahPortfolioSummary getPortfolioSummary() {
        // Build portfolio summary
        List<MudarabahAccount> allAccounts = mudarabahAccountRepository.findAll();
        long savingsCount = allAccounts.stream().filter(a -> a.getAccountSubType() == MudarabahAccountSubType.SAVINGS).count();
        long tdCount = allAccounts.stream().filter(a -> a.getAccountSubType() == MudarabahAccountSubType.TERM_DEPOSIT).count();
        long noticeCount = allAccounts.stream().filter(a -> a.getAccountSubType() == MudarabahAccountSubType.NOTICE_DEPOSIT).count();

        BigDecimal totalSavings = allAccounts.stream()
                .filter(a -> a.getAccountSubType() == MudarabahAccountSubType.SAVINGS)
                .map(a -> a.getAccount().getBookBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTD = allAccounts.stream()
                .filter(a -> a.getAccountSubType() == MudarabahAccountSubType.TERM_DEPOSIT)
                .map(a -> a.getAccount().getBookBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgPsr = allAccounts.isEmpty() ? BigDecimal.ZERO :
                allAccounts.stream().map(MudarabahAccount::getProfitSharingRatioCustomer)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(allAccounts.size()), 4, RoundingMode.HALF_UP);

        return MudarabahPortfolioSummary.builder()
                .totalMudarabahAccounts(allAccounts.size())
                .savingsCount(savingsCount)
                .termDepositCount(tdCount)
                .noticeDepositCount(noticeCount)
                .totalSavingsBalance(totalSavings)
                .totalTermDepositBalance(totalTD)
                .averagePsrCustomer(avgPsr)
                .build();
    }

    // Validation helpers
    private void validatePsr(BigDecimal customer, BigDecimal bank) {
        if (customer.compareTo(BigDecimal.ZERO) <= 0 || customer.compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("Customer PSR must be between 0 and 100 (exclusive/inclusive)", "INVALID_PSR_RANGE");
        }
        if (bank.compareTo(BigDecimal.ZERO) <= 0 || bank.compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("Bank PSR must be between 0 and 100 (exclusive/inclusive)", "INVALID_PSR_RANGE");
        }
        BigDecimal sum = customer.add(bank);
        if (sum.compareTo(new BigDecimal("100.0000")) != 0) {
            throw new BusinessException("PSR customer + bank must equal exactly 100. Got: " + sum, "PSR_SUM_INVALID");
        }
        // ST-006: PSR must be ratio, not fixed amount
        if (customer.compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("PSR appears to be a fixed amount, not a ratio. Must be 0-100 percentage (ST-006)", "PSR_NOT_RATIO");
        }
    }

    private String generateAccountNumber() {
        return "MDR" + System.currentTimeMillis() % 10000000000L;
    }

    private MudarabahAccountResponse toResponse(MudarabahAccount ma) {
        Account account = ma.getAccount();

        // Populate pool info
        String poolCode = null;
        String poolName = null;
        BigDecimal poolTotalBalance = null;
        if (ma.getInvestmentPoolId() != null) {
            var poolOpt = investmentPoolRepository.findById(ma.getInvestmentPoolId());
            if (poolOpt.isPresent()) {
                InvestmentPool pool = poolOpt.get();
                poolCode = pool.getPoolCode();
                poolName = pool.getName();
                poolTotalBalance = pool.getTotalPoolBalance();
            }
        }

        // Calculate weight in pool
        BigDecimal accountWeight = BigDecimal.ZERO;
        if (ma.getInvestmentPoolId() != null) {
            BigDecimal poolTotal = mudarabahAccountRepository.sumBalanceByPoolId(ma.getInvestmentPoolId());
            if (poolTotal != null && poolTotal.compareTo(BigDecimal.ZERO) > 0) {
                accountWeight = account.getBookBalance().multiply(new BigDecimal("100"))
                        .divide(poolTotal, 4, RoundingMode.HALF_UP);
            }
        }

        return MudarabahAccountResponse.builder()
                .id(ma.getId())
                .accountId(account.getId())
                .accountNumber(account.getAccountNumber())
                .contractReference(ma.getContractReference())
                .contractSignedDate(ma.getContractSignedDate())
                .contractVersion(ma.getContractVersion())
                .contractTypeCode(ma.getContractTypeCode())
                .mudarabahType(ma.getMudarabahType().name())
                .restrictionDetails(ma.getRestrictionDetails())
                .accountSubType(ma.getAccountSubType().name())
                .profitSharingRatioCustomer(ma.getProfitSharingRatioCustomer())
                .profitSharingRatioBank(ma.getProfitSharingRatioBank())
                .psrAgreedAt(ma.getPsrAgreedAt())
                .investmentPoolId(ma.getInvestmentPoolId())
                .poolCode(poolCode)
                .poolName(poolName)
                .poolTotalBalance(poolTotalBalance)
                .accountWeightInPool(accountWeight)
                .poolJoinDate(ma.getPoolJoinDate())
                .weightageMethod(ma.getWeightageMethod() != null ? ma.getWeightageMethod().name() : null)
                .lastProfitDistributionDate(ma.getLastProfitDistributionDate())
                .lastProfitDistributionAmount(ma.getLastProfitDistributionAmount())
                .cumulativeProfitReceived(ma.getCumulativeProfitReceived())
                .indicativeProfitRate(ma.getIndicativeProfitRate())
                .lastDistributionRate(ma.getIndicativeProfitRate())
                .hasActiveFatwa(ma.getIslamicProductTemplateId() != null)
                .profitReinvest(ma.isProfitReinvest())
                .lossExposure(ma.isLossExposure())
                .lossDisclosureAccepted(ma.isLossDisclosureAccepted())
                .maximumLossExposure(ma.getMaximumLossExposure())
                .tenorDays(ma.getTenorDays())
                .maturityDate(ma.getMaturityDate())
                .maturityInstruction(ma.getMaturityInstruction() != null ? ma.getMaturityInstruction().name() : null)
                .rolloverCount(ma.getRolloverCount())
                .zakatApplicable(ma.isZakatApplicable())
                .earlyWithdrawalAllowed(ma.isEarlyWithdrawalAllowed())
                .earlyWithdrawalPenalty(ma.getEarlyWithdrawalPenalty() != null ? ma.getEarlyWithdrawalPenalty().name() : null)
                .preferredLanguage(ma.getPreferredLanguage() != null ? ma.getPreferredLanguage().name() : null)
                .statementFrequency(ma.getStatementFrequency() != null ? ma.getStatementFrequency().name() : null)
                .bookBalance(account.getBookBalance())
                .availableBalance(account.getAvailableBalance())
                .status(account.getStatus() != null ? account.getStatus().name() : null)
                .openedDate(account.getOpenedDate())
                .build();
    }
}
