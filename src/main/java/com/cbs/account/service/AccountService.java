package com.cbs.account.service;

import com.cbs.account.dto.*;
import com.cbs.account.entity.*;
import com.cbs.account.mapper.AccountMapper;
import com.cbs.account.repository.*;
import com.cbs.account.validation.AccountValidator;
import com.cbs.card.entity.Card;
import com.cbs.card.entity.CardStatus;
import com.cbs.card.repository.CardRepository;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.overdraft.entity.CreditFacility;
import com.cbs.overdraft.entity.FacilityStatus;
import com.cbs.overdraft.repository.CreditFacilityRepository;
import com.cbs.provider.interest.DayCountEngine;
import com.cbs.provider.numbering.AccountNumberGenerator;
import com.cbs.standing.entity.StandingInstruction;
import com.cbs.standing.repository.StandingInstructionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AccountService {

    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;
    private final InterestTierRepository interestTierRepository;
    private final AccountSignatoryRepository signatoryRepository;
    private final TransactionJournalRepository transactionRepository;
    private final CustomerRepository customerRepository;
    private final AccountHoldRepository holdRepository;
    private final AccountMaintenanceLogRepository maintenanceLogRepository;
    private final InterestPostingHistoryRepository interestPostingHistoryRepository;
    private final CardRepository cardRepository;
    private final CreditFacilityRepository creditFacilityRepository;
    private final StandingInstructionRepository standingInstructionRepository;
    private final AccountMapper accountMapper;
    private final AccountValidator accountValidator;
    private final AccountNumberGenerator numberGenerator;
    private final DayCountEngine dayCountEngine;
    private final CbsProperties cbsProperties;
    private final AccountPostingService accountPostingService;

    // ========================================================================
    // ACCOUNT OPENING
    // ========================================================================

    @Transactional
    public AccountResponse openAccount(OpenAccountRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));

        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Cannot open account for non-active customer (status: " +
                    customer.getStatus() + ")", "CUSTOMER_NOT_ACTIVE");
        }

        Product product = productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        if (!Boolean.TRUE.equals(product.getIsActive())) {
            throw new BusinessException("Product " + product.getCode() + " is not active", "PRODUCT_INACTIVE");
        }

        String currency = StringUtils.hasText(request.getCurrencyCode()) ?
                request.getCurrencyCode() : product.getCurrencyCode();

        accountValidator.validateOpeningDeposit(product, request.getInitialDeposit());
        accountValidator.validateOverdraftSetup(product, request.getOverdraftLimit());

        // Pluggable account number generation (SEQUENTIAL, IBAN, NUBAN, BBAN)
        String accountNumber = numberGenerator.generate(accountRepository.getNextAccountNumberSequence());
        String accountName = StringUtils.hasText(request.getAccountName()) ?
                request.getAccountName() : customer.getDisplayName();

        Account account = Account.builder()
                .accountNumber(accountNumber)
                .accountName(accountName)
                .customer(customer)
                .product(product)
                .currencyCode(currency)
                .accountType(request.getAccountType())
                .status(AccountStatus.ACTIVE)
                .openedDate(LocalDate.now())
                .activatedDate(LocalDate.now())
                .branchCode(request.getBranchCode())
                .relationshipManager(request.getRelationshipManager())
                .statementFrequency(request.getStatementFrequency() != null ?
                        request.getStatementFrequency() : "MONTHLY")
                .overdraftLimit(request.getOverdraftLimit() != null ?
                        request.getOverdraftLimit() : BigDecimal.ZERO)
                .build();

        if (Boolean.TRUE.equals(product.getInterestBearing())) {
            BigDecimal rate = resolveInterestRate(product, BigDecimal.ZERO);
            account.setApplicableInterestRate(rate);
            account.setLastInterestCalcDate(LocalDate.now());
        }

        if (!CollectionUtils.isEmpty(request.getSignatories())) {
            for (SignatoryDto sigDto : request.getSignatories()) {
                Customer sigCustomer = customerRepository.findById(sigDto.getCustomerId())
                        .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", sigDto.getCustomerId()));
                AccountSignatory signatory = AccountSignatory.builder()
                        .customer(sigCustomer)
                        .signatoryType(sigDto.getSignatoryType())
                        .signingRule(sigDto.getSigningRule() != null ? sigDto.getSigningRule() : "ANY")
                        .build();
                account.addSignatory(signatory);
            }
        }

        Account saved = accountRepository.save(account);

        if (request.getInitialDeposit() != null && request.getInitialDeposit().compareTo(BigDecimal.ZERO) > 0) {
            accountPostingService.postCreditAgainstGl(
                    saved,
                    TransactionType.OPENING_BALANCE,
                    request.getInitialDeposit(),
                    "Opening balance deposit",
                    TransactionChannel.BRANCH,
                    null,
                    cbsProperties.getLedger().getOpeningBalanceContraGlCode(),
                    "ACCOUNT",
                    saved.getAccountNumber()
            );
        }

        log.info("Account opened: number={}, product={}, customer={}, scheme={}",
                saved.getAccountNumber(), product.getCode(), customer.getCifNumber(),
                cbsProperties.getAccount().getNumberingScheme());

        return buildAccountResponse(saved);
    }

    // ========================================================================
    // QUERIES
    // ========================================================================

    public AccountResponse getAccount(String accountNumber) {
        Account account = accountRepository.findByAccountNumberWithDetails(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        return buildAccountResponse(account);
    }

    public AccountResponse getAccountById(Long accountId) {
        Account account = accountRepository.findByIdWithProduct(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
        return buildAccountResponse(account);
    }

    public boolean isValidNuban(String nuban) {
        return numberGenerator.isValidNuban(nuban);
    }

    public List<AccountResponse> getCustomerAccounts(Long customerId) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        return accountMapper.toResponseList(accountRepository.findByCustomerId(customerId));
    }

    public Page<AccountResponse> searchAccounts(AccountStatus status, String branchCode, Pageable pageable) {
        Page<Account> page;
        if (status != null) {
            page = accountRepository.findByStatus(status, pageable);
        } else if (StringUtils.hasText(branchCode)) {
            page = accountRepository.findByBranchCode(branchCode, pageable);
        } else {
            page = accountRepository.findAll(pageable);
        }
        return page.map(this::buildAccountResponse);
    }

    // ========================================================================
    // TRANSACTIONS
    // ========================================================================

    @Transactional
    public TransactionResponse postDebit(PostTransactionRequest request) {
        Account account = findAccountOrThrow(request.getAccountNumber());
        TransactionJournal txn;
        if (StringUtils.hasText(request.getContraAccountNumber())) {
            Account contraAccount = findAccountOrThrow(request.getContraAccountNumber());
            txn = accountPostingService.postTransfer(
                    account,
                    contraAccount,
                    request.getAmount(),
                    request.getAmount(),
                    request.getNarration(),
                    String.format("Transfer from %s", account.getAccountNumber()),
                    request.getChannel() != null ? request.getChannel() : TransactionChannel.SYSTEM,
                    request.getExternalRef(),
                    "ACCOUNT",
                    account.getAccountNumber()
            ).debitTransaction();
        } else if (StringUtils.hasText(request.getContraGlCode())) {
            txn = accountPostingService.postDebitAgainstGl(
                    account,
                    request.getTransactionType(),
                    request.getAmount(),
                    request.getNarration(),
                    request.getChannel() != null ? request.getChannel() : TransactionChannel.SYSTEM,
                    request.getExternalRef(),
                    request.getContraGlCode(),
                    "ACCOUNT",
                    account.getAccountNumber()
            );
        } else {
            throw new BusinessException("A contra account number or contra GL code is required for debit posting",
                    "MISSING_CONTRA_REFERENCE");
        }

        return accountMapper.toTransactionResponse(txn);
    }

    @Transactional
    public TransactionResponse postCredit(PostTransactionRequest request) {
        Account account = findAccountOrThrow(request.getAccountNumber());
        TransactionJournal txn;
        if (StringUtils.hasText(request.getContraAccountNumber())) {
            Account contraAccount = findAccountOrThrow(request.getContraAccountNumber());
            txn = accountPostingService.postTransfer(
                    contraAccount,
                    account,
                    request.getAmount(),
                    request.getAmount(),
                    String.format("Transfer to %s", account.getAccountNumber()),
                    request.getNarration(),
                    request.getChannel() != null ? request.getChannel() : TransactionChannel.SYSTEM,
                    request.getExternalRef(),
                    "ACCOUNT",
                    account.getAccountNumber()
            ).creditTransaction();
        } else if (StringUtils.hasText(request.getContraGlCode())) {
            txn = accountPostingService.postCreditAgainstGl(
                    account,
                    request.getTransactionType(),
                    request.getAmount(),
                    request.getNarration(),
                    request.getChannel() != null ? request.getChannel() : TransactionChannel.SYSTEM,
                    request.getExternalRef(),
                    request.getContraGlCode(),
                    "ACCOUNT",
                    account.getAccountNumber()
            );
        } else {
            throw new BusinessException("A contra account number or contra GL code is required for credit posting",
                    "MISSING_CONTRA_REFERENCE");
        }

        return accountMapper.toTransactionResponse(txn);
    }

    @Transactional
    public TransactionResponse postTransfer(String fromAccountNumber, String toAccountNumber,
                                             BigDecimal amount, String narration, TransactionChannel channel) {
        Account fromAccount = findAccountOrThrow(fromAccountNumber);
        Account toAccount = findAccountOrThrow(toAccountNumber);

        String transferNarration = narration != null ? narration : String.format("Transfer to %s", toAccountNumber);
        TransactionJournal debitTxn = accountPostingService.postTransfer(
                fromAccount,
                toAccount,
                amount,
                amount,
                transferNarration,
                String.format("Transfer from %s", fromAccountNumber),
                channel,
                null,
                "ACCOUNT",
                fromAccountNumber + "->" + toAccountNumber
        ).debitTransaction();

        return accountMapper.toTransactionResponse(debitTxn);
    }

    public Page<TransactionResponse> getTransactionHistory(String accountNumber, LocalDate from,
                                                             LocalDate to, Pageable pageable) {
        Account account = findAccountOrThrow(accountNumber);
        Page<TransactionJournal> page;
        if (from != null && to != null) {
            page = transactionRepository.findByAccountIdAndDateRange(account.getId(), from, to, pageable);
        } else {
            page = transactionRepository.findByAccountIdOrderByCreatedAtDesc(account.getId(), pageable);
        }
        return page.map(accountMapper::toTransactionResponse);
    }

    // ========================================================================
    // INTEREST ENGINE — uses DayCountEngine for global day-count conventions
    // ========================================================================

    public BigDecimal resolveInterestRate(Product product, BigDecimal balance) {
        if (!Boolean.TRUE.equals(product.getInterestBearing())) {
            return BigDecimal.ZERO;
        }
        List<InterestTier> tiers = interestTierRepository.findActiveTiersByProduct(product.getId());
        if (!tiers.isEmpty()) {
            for (InterestTier tier : tiers) {
                if (tier.containsBalance(balance)) {
                    return tier.getInterestRate();
                }
            }
            return product.getBaseInterestRate();
        }
        return product.getBaseInterestRate();
    }

    /**
     * Daily interest accrual using configured day-count convention (ACT/365, ACT/360, 30/360, ACT/ACT).
     */
    @Transactional
    public BigDecimal accrueInterestForAccount(Long accountId) {
        Account account = accountRepository.findByIdWithProduct(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        Product product = account.getProduct();
        if (!Boolean.TRUE.equals(product.getInterestBearing()) || !account.isActive()) {
            return BigDecimal.ZERO;
        }

        BigDecimal balance = resolveBalanceForInterest(account, product);
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal rate = resolveInterestRate(product, account.getBookBalance());
        account.setApplicableInterestRate(rate);

        // Use DayCountEngine for globally correct daily accrual
        BigDecimal dailyInterest = dayCountEngine.calculateDailyAccrual(balance, rate, LocalDate.now());

        account.setAccruedInterest(account.getAccruedInterest().add(dailyInterest));
        account.setLastInterestCalcDate(LocalDate.now());
        accountRepository.save(account);

        log.debug("Interest accrued: account={}, balance={}, rate={}%, daily={}, convention={}",
                account.getAccountNumber(), balance, rate, dailyInterest,
                cbsProperties.getInterest().getDayCountConvention());

        return dailyInterest;
    }

    @Transactional
    public TransactionResponse postInterest(Long accountId) {
        Account account = accountRepository.findByIdWithProduct(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        BigDecimal interest = account.getAccruedInterest();
        if (interest.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("No accrued interest to post for account " +
                    account.getAccountNumber(), "NO_ACCRUED_INTEREST");
        }

        int postingScale = cbsProperties.getInterest().getPostingScale();
        BigDecimal roundedInterest = interest.setScale(postingScale, RoundingMode.HALF_UP);
        account.setAccruedInterest(BigDecimal.ZERO);
        account.setLastInterestPostDate(LocalDate.now());

        TransactionJournal txn = accountPostingService.postCreditAgainstGl(
                account,
                TransactionType.INTEREST_POSTING,
                roundedInterest,
                String.format("Interest posting @ %s%% p.a. (%s)",
                        account.getApplicableInterestRate(),
                        cbsProperties.getInterest().getDayCountConvention()),
                TransactionChannel.SYSTEM,
                null,
                requiredInterestExpenseGl(account),
                "ACCOUNT",
                account.getAccountNumber()
        );

        accountRepository.save(account);
        return accountMapper.toTransactionResponse(txn);
    }

    @Transactional
    public int batchAccrueInterest() {
        List<Account> accounts = accountRepository.findActiveInterestBearingAccounts();
        int processed = 0;
        for (Account account : accounts) {
            try {
                accrueInterestForAccount(account.getId());
                processed++;
            } catch (Exception e) {
                log.error("Interest accrual failed for account {}: {}", account.getAccountNumber(), e.getMessage());
            }
        }
        log.info("Batch interest accrual: processed={}, convention={}",
                processed, cbsProperties.getInterest().getDayCountConvention());
        return processed;
    }

    // ========================================================================
    // ACCOUNT STATUS
    // ========================================================================

    @Transactional
    public AccountResponse changeAccountStatus(String accountNumber, AccountStatus newStatus, String reason) {
        Account account = findAccountOrThrow(accountNumber);
        accountValidator.validateStatusTransition(account.getStatus(), newStatus);

        if (newStatus == AccountStatus.CLOSED) {
            accountValidator.validateAccountClosure(account);
            account.setClosedDate(LocalDate.now());
        }
        if (newStatus == AccountStatus.DORMANT) {
            account.setDormancyDate(LocalDate.now());
        }
        if (newStatus == AccountStatus.ACTIVE && account.getStatus() == AccountStatus.DORMANT) {
            account.setDormancyDate(null);
            account.setLastTransactionDate(LocalDate.now());
        }

        account.setStatus(newStatus);
        accountRepository.save(account);
        return buildAccountResponse(account);
    }

    // ========================================================================
    // PRODUCT CATALOG
    // ========================================================================

    public List<ProductDto> getAllProducts() {
        return accountMapper.toProductDtoList(productRepository.findByIsActiveTrueOrderByProductCategoryAscNameAsc());
    }

    public ProductDto getProduct(String code) {
        Product product = productRepository.findByCodeWithTiers(code)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", code));
        ProductDto dto = accountMapper.toProductDto(product);
        dto.setInterestTiers(accountMapper.toInterestTierDtoList(product.getInterestTiers()));
        return dto;
    }

    public List<ProductDto> getProductsByCategory(ProductCategory category) {
        return accountMapper.toProductDtoList(productRepository.findByProductCategoryAndIsActiveTrue(category));
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private Account findAccountOrThrow(String accountNumber) {
        return accountRepository.findByAccountNumberWithDetails(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
    }

    private BigDecimal resolveBalanceForInterest(Account account, Product product) {
        String method = product.getInterestCalcMethod();
        if ("MINIMUM_BALANCE".equals(method)) {
            LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
            return transactionRepository.findMinimumBalanceInPeriod(account.getId(), monthStart, LocalDate.now());
        }
        if ("AVERAGE_BALANCE".equals(method)) {
            LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
            return transactionRepository.findAverageBalanceInPeriod(account.getId(), monthStart, LocalDate.now());
        }
        return account.getBookBalance();
    }

    private AccountResponse buildAccountResponse(Account account) {
        AccountResponse response = accountMapper.toResponse(account);
        List<AccountSignatory> signatories = signatoryRepository.findByAccountIdWithCustomer(account.getId());
        response.setSignatories(accountMapper.toSignatoryDtoList(signatories));
        return response;
    }

    private String requiredInterestExpenseGl(Account account) {
        Product product = account.getProduct();
        if (product == null || !StringUtils.hasText(product.getGlInterestExpenseCode())) {
            throw new BusinessException("Interest expense GL is required for product " +
                    (product != null ? product.getCode() : "UNKNOWN"), "MISSING_INTEREST_EXPENSE_GL");
        }
        return product.getGlInterestExpenseCode();
    }

    public long countByStatus(AccountStatus status) {
        return accountRepository.countByStatus(status);
    }

    // ========================================================================
    // HOLDS
    // ========================================================================

    public List<AccountHold> getAccountHolds(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        return holdRepository.findByAccountIdOrderByCreatedAtDesc(account.getId());
    }

    @Transactional
    public void releaseHold(String accountNumber, Long holdId, String reason) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        AccountHold hold = holdRepository.findById(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("AccountHold", "id", holdId));
        if (!hold.getAccount().getId().equals(account.getId())) {
            throw new BusinessException("Hold does not belong to this account", "HOLD_ACCOUNT_MISMATCH");
        }
        hold.setStatus("RELEASED");
        hold.setReleaseDate(LocalDate.now());
        hold.setReleaseReason(reason);
        holdRepository.save(hold);

        // Reduce lien amount on account
        account.setLienAmount(account.getLienAmount().subtract(hold.getAmount()).max(BigDecimal.ZERO));
        accountRepository.save(account);

        logMaintenance(account.getId(), "HOLD_RELEASED",
                "Hold " + hold.getReference() + " released: " + reason, "SYSTEM");
    }

    // ========================================================================
    // SIGNATORIES
    // ========================================================================

    public List<AccountSignatory> getSignatories(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        return signatoryRepository.findByAccountIdWithCustomer(account.getId());
    }

    @Transactional
    public AccountSignatory addSignatory(String accountNumber, Long customerId, String role) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        Customer sigCustomer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        if (signatoryRepository.existsByAccountIdAndCustomerId(account.getId(), customerId)) {
            throw new DuplicateResourceException("AccountSignatory", "customerId", customerId);
        }
        SignatoryType sigType;
        try { sigType = SignatoryType.valueOf(role); }
        catch (IllegalArgumentException e) { sigType = SignatoryType.AUTHORISED; }

        AccountSignatory sig = AccountSignatory.builder()
                .account(account).customer(sigCustomer)
                .signatoryType(sigType).build();
        AccountSignatory saved = signatoryRepository.save(sig);
        logMaintenance(account.getId(), "SIGNATORY_ADDED",
                "Signatory added: " + sigCustomer.getDisplayName() + " (" + role + ")", "SYSTEM");
        return saved;
    }

    @Transactional
    public void removeSignatory(String accountNumber, Long signatoryId, String reason) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        AccountSignatory sig = signatoryRepository.findById(signatoryId)
                .orElseThrow(() -> new ResourceNotFoundException("AccountSignatory", "id", signatoryId));
        sig.setIsActive(false);
        sig.setEffectiveTo(LocalDate.now());
        signatoryRepository.save(sig);
        logMaintenance(account.getId(), "SIGNATORY_REMOVED",
                "Signatory removed (id=" + signatoryId + "): " + reason, "SYSTEM");
    }

    // ========================================================================
    // MAINTENANCE HISTORY
    // ========================================================================

    public List<AccountMaintenanceLog> getMaintenanceHistory(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        return maintenanceLogRepository.findByAccountIdOrderByCreatedAtDesc(account.getId());
    }

    @Transactional
    public void logMaintenance(Long accountId, String action, String details, String performedBy) {
        AccountMaintenanceLog entry = AccountMaintenanceLog.builder()
                .accountId(accountId).action(action).details(details)
                .performedBy(performedBy).build();
        maintenanceLogRepository.save(entry);
    }

    // ========================================================================
    // INTEREST HISTORY
    // ========================================================================

    public List<InterestPostingHistory> getInterestHistory(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        return interestPostingHistoryRepository.findByAccountIdOrderByPostingDateDesc(account.getId());
    }

    // ========================================================================
    // LINKED PRODUCTS
    // ========================================================================

    public Map<String, Object> getLinkedProducts(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
        Long accountId = account.getId();

        // Cards
        List<Card> cards = cardRepository.findByAccountIdAndStatus(accountId, CardStatus.ACTIVE);
        Map<String, Object> debitCard = null;
        if (!cards.isEmpty()) {
            Card card = cards.get(0);
            debitCard = Map.of(
                    "maskedPan", card.getCardNumberMasked(),
                    "status", card.getStatus().name(),
                    "expiryDate", card.getExpiryDate() != null ? card.getExpiryDate().toString() : "");
        }

        // Overdraft facility
        List<CreditFacility> facilities = creditFacilityRepository.findByAccountIdAndStatus(accountId, FacilityStatus.ACTIVE);
        Map<String, Object> overdraftFacility = null;
        if (!facilities.isEmpty()) {
            CreditFacility f = facilities.get(0);
            overdraftFacility = Map.of(
                    "limit", f.getSanctionedLimit(),
                    "utilized", f.getUtilizedAmount(),
                    "expiryDate", f.getExpiryDate() != null ? f.getExpiryDate().toString() : "");
        }

        // Standing orders
        Page<StandingInstruction> standingPage = standingInstructionRepository.findByDebitAccountId(
                accountId, org.springframework.data.domain.PageRequest.of(0, 50));
        List<Map<String, Object>> standingOrders = standingPage.getContent().stream().map(so -> Map.<String, Object>of(
                "id", so.getId().toString(),
                "beneficiary", so.getCreditAccountNumber(),
                "amount", so.getAmount(),
                "frequency", so.getFrequency(),
                "nextExecution", so.getNextExecutionDate() != null ? so.getNextExecutionDate().toString() : ""
        )).toList();

        java.util.LinkedHashMap<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("debitCard", debitCard);
        result.put("standingOrders", standingOrders);
        result.put("directDebits", List.of());
        result.put("overdraftFacility", overdraftFacility);
        return result;
    }
}
