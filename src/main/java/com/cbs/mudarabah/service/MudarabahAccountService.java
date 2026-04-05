package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
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
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

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
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final CurrentActorProvider actorProvider;

    // GL codes for Mudarabah
    private static final String MUDARABAH_INVESTMENT_GL = "3100-MDR-001";
    private static final String CASH_GL = "1100-000-001";

    private final PoolWeightageService poolWeightageService;

    public MudarabahAccountResponse openMudarabahSavingsAccount(OpenMudarabahSavingsRequest request) {
        // Customer validation
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new BusinessException("Customer not found: " + request.getCustomerId(), "CUSTOMER_NOT_FOUND"));
        // KYC check
        if (!"ACTIVE".equals(customer.getStatus() != null ? customer.getStatus().name() : "")) {
            throw new BusinessException("Customer is not active. Status: " + customer.getStatus(), "CUSTOMER_NOT_ACTIVE");
        }

        // Validate minimum opening balance
        if (request.getInitialDeposit() != null && request.getInitialDeposit().compareTo(new BigDecimal("500")) < 0) {
            throw new BusinessException("Minimum opening deposit for Mudarabah savings is SAR 500", "BELOW_MINIMUM_DEPOSIT");
        }

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
        Product product = productRepository.findByCode(request.getProductCode())
            .orElseThrow(() -> new BusinessException("Product not found: " + request.getProductCode(), "PRODUCT_NOT_FOUND"));

        Account account = Account.builder()
                .accountNumber(generateAccountNumber())
                .accountName("Mudarabah Savings - " + request.getCustomerId())
                .currencyCode(request.getCurrencyCode() != null ? request.getCurrencyCode() : "SAR")
                .accountType(AccountType.INDIVIDUAL)
            .product(product)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .activatedDate(LocalDate.now())
                .build();
        account.setCustomer(customer);  // Link customer to account
        account = accountRepository.save(account);

        // 6. Create MudarabahAccount extension
        String contractRef = "MDR-SAV-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

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
                .rolloverCount(0)
                .build();

        mudarabahAccount = mudarabahAccountRepository.save(mudarabahAccount);

        // 6b. Assign to default investment pool if available
        // Pool assignment is deferred to allow product configuration to determine the correct pool.
        // Use assignToPool() after account creation to link to the appropriate pool.
        log.info("Pool assignment deferred for account {} - use assignToPool() to link to investment pool", mudarabahAccount.getContractReference());

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

        log.info("AUDIT: Mudarabah account opened - customer={}, contractRef={}, PSR={}:{}, pool={}, actor={}",
                customer.getId(), contractRef, psrCustomer, psrBank, mudarabahAccount.getInvestmentPoolId(),
                actorProvider.getCurrentActor());

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
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Deposit amount must be greater than zero", "INVALID_AMOUNT");
        }

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

        // Update pool participant weight (new deposit affects pool weightage)
        if (ma.getInvestmentPoolId() != null) {
            ma.setCurrentWeight(calculateCurrentWeight(accountId));
        }

        ma.setLastActivityDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);

        log.info("Mudarabah deposit: accountId={}, amount={}", accountId, request.getAmount());
        return toResponse(ma);
    }

    public MudarabahAccountResponse withdraw(Long accountId, MudarabahWithdrawalRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Withdrawal amount must be greater than zero", "INVALID_AMOUNT");
        }

        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found for accountId: " + accountId));
        Account account = ma.getAccount();

        if (!account.isActive()) {
            throw new BusinessException("Account is not active", "ACCOUNT_NOT_ACTIVE");
        }
        if (!account.hasSufficientBalance(request.getAmount())) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }
        // For NOTICE_DEPOSIT, enforce notice period
        if (ma.getAccountSubType() == MudarabahAccountSubType.NOTICE_DEPOSIT
                && ma.getNoticePeriodDays() != null && ma.getNoticePeriodDays() > 0) {
            throw new BusinessException(
                    "Notice deposit requires " + ma.getNoticePeriodDays() + " days notice before withdrawal. Please submit a withdrawal notice first.",
                    "NOTICE_PERIOD_REQUIRED");
        }

        // Minimum balance check
        BigDecimal balanceAfter = account.getBookBalance().subtract(request.getAmount());
        if (balanceAfter.compareTo(BigDecimal.ZERO) > 0 && balanceAfter.compareTo(new BigDecimal("500")) < 0) {
            log.warn("Withdrawal will bring balance below minimum operating balance of SAR 500 for account {}", accountId);
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

        // Update pool participant weight (withdrawal affects pool weightage)
        if (ma.getInvestmentPoolId() != null) {
            ma.setCurrentWeight(calculateCurrentWeight(accountId));
        }

        ma.setLastActivityDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);

        log.info("Mudarabah withdrawal: accountId={}, amount={}", accountId, request.getAmount());
        return toResponse(ma);
    }

    public void assignToPool(Long accountId, Long poolId) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));

        // Validate pool exists and is active
        InvestmentPool pool = investmentPoolRepository.findById(poolId)
                .orElseThrow(() -> new BusinessException("Investment pool not found: " + poolId, "POOL_NOT_FOUND"));
        if (pool.getStatus() != PoolStatus.ACTIVE) {
            throw new BusinessException("Cannot assign to pool with status " + pool.getStatus() + ": " + poolId, "POOL_NOT_ACTIVE");
        }
        String accountCurrency = ma.getAccount().getCurrencyCode();
        if (pool.getCurrencyCode() != null && !pool.getCurrencyCode().equals(accountCurrency)) {
            throw new BusinessException("Pool currency " + pool.getCurrencyCode()
                    + " does not match account currency " + accountCurrency, "POOL_CURRENCY_MISMATCH");
        }

        ma.setInvestmentPoolId(poolId);
        ma.setPoolJoinDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);

        log.info("AUDIT: Mudarabah account {} assigned to pool {} by {}", accountId, poolId, actorProvider.getCurrentActor());
    }

    public void changePool(Long accountId, Long newPoolId, String reason) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));

        // Validate new pool exists and is acceptable
        InvestmentPool newPool = investmentPoolRepository.findById(newPoolId)
                .orElseThrow(() -> new BusinessException("Investment pool not found: " + newPoolId, "POOL_NOT_FOUND"));
        if (newPool.getStatus() != PoolStatus.ACTIVE) {
            throw new BusinessException("Cannot move to pool with status " + newPool.getStatus() + ": " + newPoolId, "POOL_NOT_ACTIVE");
        }
        String accountCurrency = ma.getAccount().getCurrencyCode();
        if (newPool.getCurrencyCode() != null && !newPool.getCurrencyCode().equals(accountCurrency)) {
            throw new BusinessException("Pool currency " + newPool.getCurrencyCode()
                    + " does not match account currency " + accountCurrency, "POOL_CURRENCY_MISMATCH");
        }

        Long oldPoolId = ma.getInvestmentPoolId();
        ma.setInvestmentPoolId(newPoolId);
        ma.setPoolJoinDate(LocalDate.now());
        mudarabahAccountRepository.save(ma);

        // Recalculate weightages for old pool (if it had one)
        if (oldPoolId != null) {
            log.info("Triggering weightage recalculation for old pool {}", oldPoolId);
            poolWeightageService.recordDailyWeightages(oldPoolId, LocalDate.now());
        }
        // Recalculate weightages for new pool
        log.info("Triggering weightage recalculation for new pool {}", newPoolId);
        poolWeightageService.recordDailyWeightages(newPoolId, LocalDate.now());

        log.info("AUDIT: Mudarabah account {} moved from pool {} to pool {}. Reason: {}. Actor: {}",
                accountId, oldPoolId, newPoolId, reason, actorProvider.getCurrentActor());
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateCurrentWeight(Long accountId) {
        MudarabahAccount ma = mudarabahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));
        if (ma.getInvestmentPoolId() == null) {
            return BigDecimal.ZERO;
        }
        // Use daily product method: weight = sum of account daily products / sum of pool daily products
        // over the current period (first of month to today)
        LocalDate periodStart = LocalDate.now().withDayOfMonth(1);
        LocalDate periodEnd = LocalDate.now();
        long periodDays = ChronoUnit.DAYS.between(periodStart, periodEnd);
        if (periodDays <= 0) {
            // First day of the month - use simple balance ratio as fallback
            BigDecimal poolTotal = mudarabahAccountRepository.sumBalanceByPoolId(ma.getInvestmentPoolId());
            if (poolTotal.compareTo(BigDecimal.ZERO) == 0) {
                return BigDecimal.ZERO;
            }
            return ma.getAccount().getBookBalance().multiply(new BigDecimal("100"))
                    .divide(poolTotal, 8, RoundingMode.HALF_UP);
        }
        BigDecimal accountDailyProducts = mudarabahAccountRepository.sumDailyProductsForAccount(
                ma.getInvestmentPoolId(), accountId, periodStart, periodEnd);
        if (accountDailyProducts == null) {
            accountDailyProducts = BigDecimal.ZERO;
        }
        BigDecimal poolDailyProducts = mudarabahAccountRepository.sumDailyProductsForPool(
                ma.getInvestmentPoolId(), periodStart, periodEnd);
        if (poolDailyProducts == null || poolDailyProducts.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return accountDailyProducts.multiply(new BigDecimal("100"))
                .divide(poolDailyProducts, 8, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public MudarabahPortfolioSummary getPortfolioSummary() {
        // Use aggregation queries instead of loading all accounts into memory
        long savingsCount = mudarabahAccountRepository.countByAccountSubType(MudarabahAccountSubType.SAVINGS);
        long tdCount = mudarabahAccountRepository.countByAccountSubType(MudarabahAccountSubType.TERM_DEPOSIT);
        long noticeCount = mudarabahAccountRepository.countByAccountSubType(MudarabahAccountSubType.NOTICE_DEPOSIT);
        long totalCount = savingsCount + tdCount + noticeCount;

        BigDecimal totalSavings = mudarabahAccountRepository.sumBalanceBySubType(MudarabahAccountSubType.SAVINGS);
        if (totalSavings == null) totalSavings = BigDecimal.ZERO;
        BigDecimal totalTD = mudarabahAccountRepository.sumBalanceBySubType(MudarabahAccountSubType.TERM_DEPOSIT);
        if (totalTD == null) totalTD = BigDecimal.ZERO;
        BigDecimal avgPsr = mudarabahAccountRepository.averagePsrCustomer();
        if (avgPsr == null) avgPsr = BigDecimal.ZERO;

        return MudarabahPortfolioSummary.builder()
                .totalMudarabahAccounts(totalCount)
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
        return "MDR" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
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
