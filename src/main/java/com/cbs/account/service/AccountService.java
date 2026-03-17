package com.cbs.account.service;

import com.cbs.account.dto.*;
import com.cbs.account.entity.*;
import com.cbs.account.mapper.AccountMapper;
import com.cbs.account.repository.*;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.provider.interest.DayCountEngine;
import com.cbs.provider.numbering.AccountNumberGenerator;
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
import java.time.format.DateTimeFormatter;
import java.util.List;

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
    private final AccountMapper accountMapper;
    private final AccountValidator accountValidator;
    private final AccountNumberGenerator numberGenerator;
    private final DayCountEngine dayCountEngine;
    private final CbsProperties cbsProperties;

    private static final DateTimeFormatter TXN_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

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
            postTransaction(saved, TransactionType.OPENING_BALANCE, request.getInitialDeposit(),
                    "Opening balance deposit", TransactionChannel.BRANCH, null);
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
        accountValidator.validateDebit(account, request.getAmount());

        TransactionJournal txn = postTransaction(account, request.getTransactionType(),
                request.getAmount(), request.getNarration(),
                request.getChannel() != null ? request.getChannel() : TransactionChannel.SYSTEM,
                request.getExternalRef());

        account.debit(request.getAmount());
        accountRepository.save(account);

        return accountMapper.toTransactionResponse(txn);
    }

    @Transactional
    public TransactionResponse postCredit(PostTransactionRequest request) {
        Account account = findAccountOrThrow(request.getAccountNumber());
        accountValidator.validateCredit(account, request.getAmount());

        account.credit(request.getAmount());
        accountRepository.save(account);

        TransactionJournal txn = postTransaction(account, request.getTransactionType(),
                request.getAmount(), request.getNarration(),
                request.getChannel() != null ? request.getChannel() : TransactionChannel.SYSTEM,
                request.getExternalRef());

        return accountMapper.toTransactionResponse(txn);
    }

    @Transactional
    public TransactionResponse postTransfer(String fromAccountNumber, String toAccountNumber,
                                             BigDecimal amount, String narration, TransactionChannel channel) {
        Account fromAccount = findAccountOrThrow(fromAccountNumber);
        Account toAccount = findAccountOrThrow(toAccountNumber);

        accountValidator.validateDebit(fromAccount, amount);
        accountValidator.validateCredit(toAccount, amount);

        fromAccount.debit(amount);
        toAccount.credit(amount);

        String transferNarration = narration != null ? narration :
                String.format("Transfer to %s", toAccountNumber);

        TransactionJournal debitTxn = postTransaction(fromAccount, TransactionType.TRANSFER_OUT,
                amount, transferNarration, channel, null);
        debitTxn.setContraAccount(toAccount);
        debitTxn.setContraAccountNumber(toAccountNumber);

        TransactionJournal creditTxn = postTransaction(toAccount, TransactionType.TRANSFER_IN,
                amount, String.format("Transfer from %s", fromAccountNumber), channel, null);
        creditTxn.setContraAccount(fromAccount);
        creditTxn.setContraAccountNumber(fromAccountNumber);

        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);
        transactionRepository.save(debitTxn);
        transactionRepository.save(creditTxn);

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

        account.credit(roundedInterest);
        account.setAccruedInterest(BigDecimal.ZERO);
        account.setLastInterestPostDate(LocalDate.now());

        TransactionJournal txn = postTransaction(account, TransactionType.INTEREST_POSTING,
                roundedInterest,
                String.format("Interest posting @ %s%% p.a. (%s)",
                        account.getApplicableInterestRate(),
                        cbsProperties.getInterest().getDayCountConvention()),
                TransactionChannel.SYSTEM, null);

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

    private TransactionJournal postTransaction(Account account, TransactionType type,
                                                BigDecimal amount, String narration,
                                                TransactionChannel channel, String externalRef) {
        if (StringUtils.hasText(externalRef) && transactionRepository.existsByExternalRef(externalRef)) {
            throw new DuplicateResourceException("Transaction", "externalRef", externalRef);
        }

        Long seq = transactionRepository.getNextTransactionRefSequence();
        String txnRef = numberGenerator.generateTxnRef(seq, LocalDate.now().format(TXN_DATE_FMT));

        TransactionJournal txn = TransactionJournal.builder()
                .transactionRef(txnRef)
                .account(account)
                .transactionType(type)
                .amount(amount)
                .currencyCode(account.getCurrencyCode())
                .runningBalance(account.getBookBalance())
                .narration(narration)
                .valueDate(LocalDate.now())
                .postingDate(LocalDate.now())
                .channel(channel)
                .externalRef(externalRef)
                .status("POSTED")
                .build();

        return transactionRepository.save(txn);
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
}
