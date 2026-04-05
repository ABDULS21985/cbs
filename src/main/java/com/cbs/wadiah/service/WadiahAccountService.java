package com.cbs.wadiah.service;

import com.cbs.account.dto.OpenAccountRequest;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductParameter;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductParameterRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.dto.*;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WadiahAccountService {

    private static final String CASH_GL = "1100-000-001";

    private final WadiahAccountRepository wadiahAccountRepository;
    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final IslamicProductParameterRepository islamicProductParameterRepository;
    private final AccountService accountService;
    private final AccountPostingService accountPostingService;
    private final TransactionJournalRepository transactionJournalRepository;
    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final HijriCalendarService hijriCalendarService;
    private final CurrentTenantResolver currentTenantResolver;

    public WadiahAccountResponse openWadiahAccount(OpenWadiahAccountRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));
        ensureKycVerified(customer.getId());

        IslamicProductTemplate islamicProduct = resolveActiveWadiahProduct(request.getProductCode());
        Product baseProduct = productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));
        BigDecimal openingBalance = defaultBigDecimal(request.getOpeningBalance());

        if (openingBalance.compareTo(defaultBigDecimal(islamicProduct.getMinAmount())) < 0) {
            throw new BusinessException("Opening balance is below the configured minimum for this Wadiah product",
                    "BELOW_MIN_OPENING_BALANCE");
        }
        validateCurrency(islamicProduct, request.getCurrencyCode(), baseProduct.getCurrencyCode());

        if (request.isHibahEligible() && !request.isHibahDisclosureSigned()) {
            throw new BusinessException("Hibah disclosure must be signed before Hibah eligibility is enabled",
                    "HIBAH_DISCLOSURE_REQUIRED");
        }
        if (request.getWadiahType() == WadiahDomainEnums.WadiahType.YAD_AMANAH && request.isSweepEnabled()) {
            throw new BusinessException("Sweep is not allowed for Yad Amanah accounts",
                    "YAD_AMANAH_SWEEP_NOT_ALLOWED");
        }
        if (request.isSweepEnabled()) {
            validateSweepTarget(request.getSweepTargetAccountId());
        }

        OpenAccountRequest openAccountRequest = OpenAccountRequest.builder()
                .customerId(request.getCustomerId())
                .productCode(request.getProductCode())
                .currencyCode(StringUtils.hasText(request.getCurrencyCode()) ? request.getCurrencyCode() : baseProduct.getCurrencyCode())
                .accountType(resolveAccountType(customer))
                .accountName(customer.getDisplayName())
                .branchCode(request.getBranchCode())
                .relationshipManager(request.getRelationshipManager())
                .statementFrequency(request.getStatementFrequency() != null ? request.getStatementFrequency().name() : "MONTHLY")
                .initialDeposit(BigDecimal.ZERO)
                .build();

        var baseAccount = accountService.openAccount(openAccountRequest);
        Account account = accountRepository.findById(baseAccount.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", baseAccount.getId()));

        WadiahAccount wadiahAccount = WadiahAccount.builder()
                .account(account)
                .wadiahType(request.getWadiahType())
                .contractReference(generateContractReference())
                .contractSignedDate(LocalDate.now())
                .contractVersion(1)
                .islamicProductTemplateId(islamicProduct.getId())
                .contractTypeCode("WADIAH")
                .principalGuaranteed(request.getWadiahType() == WadiahDomainEnums.WadiahType.YAD_DHAMANAH)
                .profitContractuallyPromised(false)
                .hibahEligible(request.getWadiahType() == WadiahDomainEnums.WadiahType.YAD_AMANAH ? false : request.isHibahEligible())
                .hibahDisclosureSigned(request.isHibahDisclosureSigned())
                .hibahDisclosureDate(request.getHibahDisclosureDate() != null ? request.getHibahDisclosureDate() : LocalDate.now())
                .minimumBalance(defaultBigDecimal(request.getMinimumBalance()))
                .chequeBookEnabled(request.isChequeBookEnabled())
                .debitCardEnabled(request.isDebitCardEnabled())
                .standingOrdersEnabled(request.isStandingOrdersEnabled())
                .sweepEnabled(request.isSweepEnabled())
                .sweepTargetAccountId(request.getSweepTargetAccountId())
                .sweepThreshold(request.getSweepThreshold())
                .onlineBankingEnabled(request.isOnlineBankingEnabled())
                .mobileEnabled(request.isMobileEnabled())
                .ussdEnabled(request.isUssdEnabled())
                .zakatApplicable(true)
                .dormancyExempt(request.isDormancyExempt())
                .lastActivityDate(LocalDate.now())
                .statementFrequency(request.getStatementFrequency() != null
                        ? request.getStatementFrequency()
                        : WadiahDomainEnums.StatementFrequency.MONTHLY)
                .preferredLanguage(request.getPreferredLanguage() != null
                        ? request.getPreferredLanguage()
                        : WadiahDomainEnums.PreferredLanguage.EN)
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();

        wadiahAccount = wadiahAccountRepository.save(wadiahAccount);

        if (openingBalance.compareTo(BigDecimal.ZERO) > 0) {
            deposit(account.getId(), WadiahDepositRequest.builder()
                    .amount(openingBalance)
                    .narration("Wadiah opening deposit")
                    .channel(TransactionChannel.BRANCH.name())
                    .externalRef(wadiahAccount.getContractReference())
                    .build());
        }

        log.info("Wadiah account opened: accountId={}, contractRef={}", account.getId(), wadiahAccount.getContractReference());
        return toResponse(wadiahAccountRepository.findById(wadiahAccount.getId()).orElse(wadiahAccount));
    }

    @Transactional(readOnly = true)
    public WadiahAccountResponse getWadiahAccount(Long accountId) {
        return toResponse(findWadiahAccount(accountId));
    }

    @Transactional(readOnly = true)
    public WadiahAccountResponse getWadiahAccountByNumber(String accountNumber) {
        return wadiahAccountRepository.findByAccountAccountNumber(accountNumber)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("WadiahAccount", "accountNumber", accountNumber));
    }

    @Transactional(readOnly = true)
    public List<WadiahAccountResponse> getCustomerWadiahAccounts(Long customerId) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        return wadiahAccountRepository.findByCustomerId(customerId).stream()
                .map(this::toResponse)
                .toList();
    }

    public void updateWadiahConfig(Long accountId, UpdateWadiahConfigRequest request) {
        WadiahAccount wadiahAccount = findWadiahAccount(accountId);
        if (request.getHibahEligible() != null) {
            if (request.getHibahEligible() && !Boolean.TRUE.equals(wadiahAccount.getHibahDisclosureSigned())) {
                throw new BusinessException("Hibah disclosure must be signed before Hibah eligibility is enabled",
                        "HIBAH_DISCLOSURE_REQUIRED");
            }
            wadiahAccount.setHibahEligible(request.getHibahEligible());
        }
        if (request.getHibahDisclosureSigned() != null) {
            wadiahAccount.setHibahDisclosureSigned(request.getHibahDisclosureSigned());
            if (request.getHibahDisclosureSigned()) {
                wadiahAccount.setHibahDisclosureDate(LocalDate.now());
            }
        }
        if (request.getChequeBookEnabled() != null) wadiahAccount.setChequeBookEnabled(request.getChequeBookEnabled());
        if (request.getDebitCardEnabled() != null) wadiahAccount.setDebitCardEnabled(request.getDebitCardEnabled());
        if (request.getStandingOrdersEnabled() != null) wadiahAccount.setStandingOrdersEnabled(request.getStandingOrdersEnabled());
        if (request.getSweepEnabled() != null) wadiahAccount.setSweepEnabled(request.getSweepEnabled());
        if (request.getSweepTargetAccountId() != null) {
            validateSweepTarget(request.getSweepTargetAccountId());
            wadiahAccount.setSweepTargetAccountId(request.getSweepTargetAccountId());
        }
        if (request.getSweepThreshold() != null) wadiahAccount.setSweepThreshold(request.getSweepThreshold());
        if (request.getOnlineBankingEnabled() != null) wadiahAccount.setOnlineBankingEnabled(request.getOnlineBankingEnabled());
        if (request.getMobileEnabled() != null) wadiahAccount.setMobileEnabled(request.getMobileEnabled());
        if (request.getUssdEnabled() != null) wadiahAccount.setUssdEnabled(request.getUssdEnabled());
        if (request.getDormancyExempt() != null) wadiahAccount.setDormancyExempt(request.getDormancyExempt());
        if (request.getStatementFrequency() != null) wadiahAccount.setStatementFrequency(request.getStatementFrequency());
        if (request.getPreferredLanguage() != null) wadiahAccount.setPreferredLanguage(request.getPreferredLanguage());
        wadiahAccountRepository.save(wadiahAccount);
    }

    public TransactionResponse deposit(Long accountId, WadiahDepositRequest request) {
        WadiahAccount wadiahAccount = findWadiahAccount(accountId);
        Account account = wadiahAccount.getAccount();
        if (!account.isActive()) {
            throw new BusinessException("Account is not active", "ACCOUNT_NOT_ACTIVE");
        }

        TransactionJournal journal = accountPostingService.postCreditAgainstGl(
                account,
                TransactionType.CREDIT,
                request.getAmount(),
                StringUtils.hasText(request.getNarration()) ? request.getNarration() : "Wadiah Deposit",
                parseChannel(request.getChannel()),
                request.getExternalRef(),
                CASH_GL,
                "WADIAH",
                wadiahAccount.getContractReference()
        );
        wadiahAccount.setLastActivityDate(LocalDate.now());
        wadiahAccountRepository.save(wadiahAccount);
        return toTransactionResponse(journal);
    }

    public TransactionResponse withdraw(Long accountId, WadiahWithdrawalRequest request) {
        WadiahAccount wadiahAccount = findWadiahAccount(accountId);
        Account account = wadiahAccount.getAccount();
        if (!account.isActive()) {
            throw new BusinessException("Account is not active", "ACCOUNT_NOT_ACTIVE");
        }
        if (wadiahAccount.getWadiahType() == WadiahDomainEnums.WadiahType.YAD_AMANAH
                && account.getBookBalance().compareTo(request.getAmount()) < 0) {
            throw new BusinessException("Yad Amanah withdrawals cannot exceed the safeguarded balance",
                    "YAD_AMANAH_LIMIT");
        }
        if (wadiahAccount.getMinimumBalance() != null
                && wadiahAccount.getMinimumBalance().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal balanceAfterWithdrawal = account.getBookBalance().subtract(request.getAmount());
            if (balanceAfterWithdrawal.compareTo(wadiahAccount.getMinimumBalance()) < 0) {
                throw new BusinessException(
                        "Withdrawal would breach the minimum balance requirement of " + wadiahAccount.getMinimumBalance(),
                        "MINIMUM_BALANCE_BREACH");
            }
        }

        TransactionJournal journal = accountPostingService.postDebitAgainstGl(
                account,
                TransactionType.DEBIT,
                request.getAmount(),
                StringUtils.hasText(request.getNarration()) ? request.getNarration() : "Wadiah Withdrawal",
                parseChannel(request.getChannel()),
                request.getExternalRef(),
                CASH_GL,
                "WADIAH",
                wadiahAccount.getContractReference()
        );
        wadiahAccount.setLastActivityDate(LocalDate.now());
        wadiahAccountRepository.save(wadiahAccount);
        return toTransactionResponse(journal);
    }

    public void configureSweep(Long accountId, Long targetInvestmentAccountId, BigDecimal threshold) {
        WadiahAccount wadiahAccount = findWadiahAccount(accountId);
        validateSweepTarget(targetInvestmentAccountId);
        if (threshold == null || threshold.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Sweep threshold must be greater than zero", "INVALID_SWEEP_THRESHOLD");
        }
        wadiahAccount.setSweepEnabled(true);
        wadiahAccount.setSweepTargetAccountId(targetInvestmentAccountId);
        wadiahAccount.setSweepThreshold(threshold);
        wadiahAccountRepository.save(wadiahAccount);
    }

    public void executeSweep(Long accountId) {
        WadiahAccount wadiahAccount = findWadiahAccount(accountId);
        if (!Boolean.TRUE.equals(wadiahAccount.getSweepEnabled())
                || wadiahAccount.getSweepTargetAccountId() == null
                || wadiahAccount.getSweepThreshold() == null) {
            throw new BusinessException("Sweep is not configured for this account", "SWEEP_NOT_CONFIGURED");
        }
        Account sourceAccount = wadiahAccount.getAccount();
        if (sourceAccount.getBookBalance().compareTo(wadiahAccount.getSweepThreshold()) <= 0) {
            return;
        }
        Account targetAccount = accountRepository.findById(wadiahAccount.getSweepTargetAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", wadiahAccount.getSweepTargetAccountId()));
        if (!sourceAccount.getCurrencyCode().equals(targetAccount.getCurrencyCode())) {
            throw new BusinessException(
                    "Sweep source currency (" + sourceAccount.getCurrencyCode()
                            + ") does not match target currency (" + targetAccount.getCurrencyCode() + ")",
                    "SWEEP_CURRENCY_MISMATCH");
        }
        BigDecimal sweepAmount = sourceAccount.getBookBalance().subtract(wadiahAccount.getSweepThreshold());
        accountPostingService.postTransfer(
                sourceAccount,
                targetAccount,
                sweepAmount,
                sweepAmount,
                "Transfer to Investment Account",
                "Wadiah sweep credit",
                TransactionChannel.SYSTEM,
                wadiahAccount.getContractReference() + ":SWEEP",
                "WADIAH",
                wadiahAccount.getContractReference()
        );
        wadiahAccount.setLastActivityDate(LocalDate.now());
        wadiahAccountRepository.save(wadiahAccount);
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateZakatableBalance(Long accountId, LocalDate asOfDate) {
        WadiahAccount wadiahAccount = findWadiahAccount(accountId);
        LocalDate effectiveDate = asOfDate != null ? asOfDate : LocalDate.now();
        LocalDate startDate = wadiahAccount.getLastZakatCalculationDate() != null
                ? wadiahAccount.getLastZakatCalculationDate()
                : wadiahAccount.getAccount().getOpenedDate();
        if (!hasCompletedHijriYear(startDate, effectiveDate)) {
            return BigDecimal.ZERO;
        }
        BigDecimal average = transactionJournalRepository.findAverageBalanceInPeriod(
                wadiahAccount.getAccount().getId(), startDate, effectiveDate);
        if (average == null || average.compareTo(BigDecimal.ZERO) <= 0) {
            average = wadiahAccount.getAccount().getBookBalance();
        }
        return average.setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public boolean isZakatDue(Long accountId) {
        return calculateZakatableBalance(accountId, LocalDate.now()).compareTo(BigDecimal.ZERO) > 0;
    }

    @Transactional(readOnly = true)
    public WadiahPortfolioSummary getPortfolioSummary() {
        List<WadiahAccount> accounts = wadiahAccountRepository.findAll();
        BigDecimal total = accounts.stream()
                .map(item -> item.getAccount().getBookBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal average = accounts.isEmpty()
                ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(accounts.size()), 2, RoundingMode.HALF_UP);

        Map<String, BigDecimal> balancesByCurrency = new LinkedHashMap<>();
        Map<String, Long> accountsByProduct = new LinkedHashMap<>();
        for (WadiahAccount item : accounts) {
            String currency = item.getAccount().getCurrencyCode();
            balancesByCurrency.put(currency,
                    balancesByCurrency.getOrDefault(currency, BigDecimal.ZERO).add(item.getAccount().getBookBalance()));
            String productCode = item.getAccount().getProduct().getCode();
            accountsByProduct.put(productCode, accountsByProduct.getOrDefault(productCode, 0L) + 1);
        }

        return WadiahPortfolioSummary.builder()
                .totalAccounts(accounts.size())
                .totalDeposits(total)
                .averageBalance(average)
                .balancesByCurrency(balancesByCurrency)
                .accountsByProduct(accountsByProduct)
                .build();
    }

    /**
     * Validates that the given account ID refers to an existing Mudarabah investment account,
     * suitable as a sweep target.
     */
    public void validateSweepTargetAccount(Long targetInvestmentAccountId) {
        validateSweepTarget(targetInvestmentAccountId);
    }

    private WadiahAccount findWadiahAccount(Long accountId) {
        return wadiahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("WadiahAccount", "accountId", accountId));
    }

    private void ensureKycVerified(Long customerId) {
        if (customerIdentificationRepository.findVerifiedByCustomerId(customerId).isEmpty()) {
            throw new BusinessException("Customer KYC must be VERIFIED before opening a Wadiah account",
                    "KYC_NOT_VERIFIED");
        }
    }

    private IslamicProductTemplate resolveActiveWadiahProduct(String productCode) {
        IslamicProductTemplate product = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        if (product.getContractType() == null || !"WADIAH".equalsIgnoreCase(product.getContractType().getCode())) {
            throw new BusinessException("Selected product is not a Wadiah product", "INVALID_WADIAH_PRODUCT");
        }
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            throw new BusinessException("Islamic product is not ACTIVE", "PRODUCT_NOT_ACTIVE");
        }
        if (product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT
                && product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED) {
            throw new BusinessException("Islamic product is not Shariah compliant", "PRODUCT_NOT_COMPLIANT");
        }
        if (Boolean.TRUE.equals(product.getFatwaRequired()) && product.getActiveFatwaId() == null) {
            throw new BusinessException("Islamic product requires an active fatwa before it can be used",
                    "ACTIVE_FATWA_REQUIRED");
        }
        if (product.getProfitCalculationMethod() != IslamicDomainEnums.ProfitCalculationMethod.NONE) {
            throw new BusinessException("Wadiah product must not use any contractual profit calculation method",
                    "INVALID_WADIAH_PROFIT_METHOD");
        }
        if (parameterAsBoolean(product.getId(), "profitContractuallyPromised", false)) {
            throw new BusinessException("Wadiah product cannot contractually promise returns",
                    "SHARIAH_WAD_001");
        }
        return product;
    }

    private boolean parameterAsBoolean(Long templateId, String name, boolean defaultValue) {
        return islamicProductParameterRepository.findByProductTemplateIdAndParameterNameIgnoreCase(templateId, name)
                .map(IslamicProductParameter::getParameterValue)
                .map(value -> "true".equalsIgnoreCase(value))
                .orElse(defaultValue);
    }

    private void validateCurrency(IslamicProductTemplate product, String requestedCurrency, String fallbackCurrency) {
        String currency = StringUtils.hasText(requestedCurrency) ? requestedCurrency : fallbackCurrency;
        if (product.getCurrencies() != null && !product.getCurrencies().isEmpty()
                && product.getCurrencies().stream().noneMatch(currency::equalsIgnoreCase)) {
            throw new BusinessException("Selected currency is not enabled for this Wadiah product",
                    "INVALID_PRODUCT_CURRENCY");
        }
    }

    private void validateSweepTarget(Long targetInvestmentAccountId) {
        if (targetInvestmentAccountId == null) {
            throw new BusinessException("Sweep target account is required", "SWEEP_TARGET_REQUIRED");
        }
        mudarabahAccountRepository.findByAccountId(targetInvestmentAccountId)
                .orElseThrow(() -> new BusinessException("Sweep target must be a Mudarabah investment account",
                        "INVALID_SWEEP_TARGET"));
    }

    private AccountType resolveAccountType(Customer customer) {
        return switch (customer.getCustomerType()) {
            case SME -> AccountType.SME;
            case CORPORATE, GOVERNMENT, NGO -> AccountType.CORPORATE;
            case TRUST -> AccountType.TRUST;
            default -> AccountType.INDIVIDUAL;
        };
    }

    private boolean hasCompletedHijriYear(LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null || toDate == null || toDate.isBefore(fromDate)) {
            return false;
        }
        if (!toDate.isBefore(fromDate.plusDays(354))) {
            return true;
        }
        HijriDateResponse start = hijriCalendarService.toHijri(fromDate);
        HijriDateResponse end = hijriCalendarService.toHijri(toDate);
        if (start.getHijriYear() == null || end.getHijriYear() == null) {
            return !toDate.isBefore(fromDate.plusDays(354));
        }
        if (end.getHijriYear() > start.getHijriYear() + 1) {
            return true;
        }
        if (end.getHijriYear().equals(start.getHijriYear() + 1)) {
            if (end.getHijriMonth() > start.getHijriMonth()) {
                return true;
            }
            if (end.getHijriMonth().equals(start.getHijriMonth())) {
                return end.getHijriDay() >= start.getHijriDay();
            }
        }
        return false;
    }

    private TransactionChannel parseChannel(String channel) {
        if (!StringUtils.hasText(channel)) {
            return TransactionChannel.SYSTEM;
        }
        try {
            return TransactionChannel.valueOf(channel.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return TransactionChannel.SYSTEM;
        }
    }

    private BigDecimal defaultBigDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String generateContractReference() {
        return "WAD-" + LocalDate.now().getYear() + "-"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private WadiahAccountResponse toResponse(WadiahAccount wadiahAccount) {
        Account account = wadiahAccount.getAccount();
        return WadiahAccountResponse.builder()
                .id(wadiahAccount.getId())
                .accountId(account.getId())
                .accountNumber(account.getAccountNumber())
                .customerId(account.getCustomer() != null ? account.getCustomer().getId() : null)
                .customerName(account.getCustomer() != null ? account.getCustomer().getDisplayName() : null)
                .productCode(account.getProduct() != null ? account.getProduct().getCode() : null)
                .productName(account.getProduct() != null ? account.getProduct().getName() : null)
                .currencyCode(account.getCurrencyCode())
                .status(account.getStatus().name())
                .bookBalance(account.getBookBalance())
                .availableBalance(account.getAvailableBalance())
                .openedDate(account.getOpenedDate())
                .contractReference(wadiahAccount.getContractReference())
                .contractSignedDate(wadiahAccount.getContractSignedDate())
                .contractVersion(wadiahAccount.getContractVersion())
                .contractTypeCode(wadiahAccount.getContractTypeCode())
                .wadiahType(wadiahAccount.getWadiahType().name())
                .principalGuaranteed(wadiahAccount.getPrincipalGuaranteed())
                .profitContractuallyPromised(wadiahAccount.getProfitContractuallyPromised())
                .hibahEligible(wadiahAccount.getHibahEligible())
                .hibahDisclosureSigned(wadiahAccount.getHibahDisclosureSigned())
                .hibahDisclosureDate(wadiahAccount.getHibahDisclosureDate())
                .minimumBalance(wadiahAccount.getMinimumBalance())
                .chequeBookEnabled(wadiahAccount.getChequeBookEnabled())
                .debitCardEnabled(wadiahAccount.getDebitCardEnabled())
                .standingOrdersEnabled(wadiahAccount.getStandingOrdersEnabled())
                .sweepEnabled(wadiahAccount.getSweepEnabled())
                .sweepTargetAccountId(wadiahAccount.getSweepTargetAccountId())
                .sweepThreshold(wadiahAccount.getSweepThreshold())
                .onlineBankingEnabled(wadiahAccount.getOnlineBankingEnabled())
                .mobileEnabled(wadiahAccount.getMobileEnabled())
                .ussdEnabled(wadiahAccount.getUssdEnabled())
                .lastHibahDistributionDate(wadiahAccount.getLastHibahDistributionDate())
                .totalHibahReceived(wadiahAccount.getTotalHibahReceived())
                .hibahFrequencyWarning(wadiahAccount.getHibahFrequencyWarning())
                .zakatApplicable(wadiahAccount.getZakatApplicable())
                .lastZakatCalculationDate(wadiahAccount.getLastZakatCalculationDate())
                .dormancyExempt(wadiahAccount.getDormancyExempt())
                .lastActivityDate(wadiahAccount.getLastActivityDate())
                .statementFrequency(wadiahAccount.getStatementFrequency().name())
                .preferredLanguage(wadiahAccount.getPreferredLanguage().name())
                .build();
    }

    private TransactionResponse toTransactionResponse(TransactionJournal journal) {
        return TransactionResponse.builder()
                .id(journal.getId())
                .transactionRef(journal.getTransactionRef())
                .accountNumber(journal.getAccount().getAccountNumber())
                .transactionType(journal.getTransactionType())
                .amount(journal.getAmount())
                .currencyCode(journal.getCurrencyCode())
                .runningBalance(journal.getRunningBalance())
                .narration(journal.getNarration())
                .valueDate(journal.getValueDate())
                .postingDate(journal.getPostingDate())
                .channel(journal.getChannel() != null ? journal.getChannel().name() : null)
                .externalRef(journal.getExternalRef())
                .status(journal.getStatus())
                .isReversed(journal.getIsReversed())
                .createdAt(journal.getCreatedAt())
                .build();
    }
}
