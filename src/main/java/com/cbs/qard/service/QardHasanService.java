package com.cbs.qard.service;

import com.cbs.account.dto.OpenAccountRequest;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductParameter;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductParameterRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.qard.dto.*;
import com.cbs.qard.entity.QardDomainEnums;
import com.cbs.qard.entity.QardHasanAccount;
import com.cbs.qard.entity.QardRepaymentSchedule;
import com.cbs.qard.repository.QardHasanAccountRepository;
import com.cbs.qard.repository.QardRepaymentScheduleRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class QardHasanService {

    private static final String CASH_GL = "1100-000-001";
    private static final String QARD_WRITE_OFF_EXPENSE_GL = "6200-QRD-001";
    private static final AtomicLong CONTRACT_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    private final QardHasanAccountRepository qardHasanAccountRepository;
    private final QardRepaymentScheduleRepository qardRepaymentScheduleRepository;
    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final IslamicProductParameterRepository islamicProductParameterRepository;
    private final AccountService accountService;
    private final AccountPostingService accountPostingService;
    private final CurrentTenantResolver currentTenantResolver;

    public QardHasanAccountResponse openQardDepositAccount(OpenQardDepositRequest request) {
        if (!request.isNoReturnDisclosed()) {
            throw new BusinessException("Qard deposit account requires explicit no-return disclosure",
                    "NO_RETURN_DISCLOSURE_REQUIRED");
        }

        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));
        ensureKycVerified(customer.getId());

        IslamicProductTemplate islamicProduct = resolveActiveQardProduct(request.getProductCode());
        Product product = productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        BigDecimal openingBalance = defaultAmount(request.getOpeningBalance());
        if (openingBalance.compareTo(defaultAmount(islamicProduct.getMinAmount())) < 0) {
            throw new BusinessException("Opening balance is below the configured minimum for this Qard product",
                    "BELOW_MIN_OPENING_BALANCE");
        }
        validateCurrency(islamicProduct, request.getCurrencyCode(), product.getCurrencyCode());

        Account account = createBaseAccount(
                customer,
                request.getProductCode(),
                request.getCurrencyCode(),
                request.getBranchCode(),
                "Qard Hasan Current - " + customer.getDisplayName()
        );

        QardHasanAccount qardAccount = QardHasanAccount.builder()
                .account(account)
                .qardType(QardDomainEnums.QardType.DEPOSIT_QARD)
                .contractReference(generateContractReference("QRD-DEP"))
                .contractSignedDate(LocalDate.now())
                .islamicProductTemplateId(islamicProduct.getId())
                .contractTypeCode("QARD")
                .principalGuaranteed(true)
                .noReturnDisclosed(true)
                .qardStatus(QardDomainEnums.QardStatus.ACTIVE)
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();
        qardAccount = qardHasanAccountRepository.save(qardAccount);

        if (openingBalance.compareTo(BigDecimal.ZERO) > 0) {
            depositToQardAccount(account.getId(), QardTransactionRequest.builder()
                    .amount(openingBalance)
                    .narration("Qard Hasan opening deposit")
                    .channel(TransactionChannel.BRANCH.name())
                    .externalRef(qardAccount.getContractReference())
                    .build());
        }

        return toResponse(qardHasanAccountRepository.findById(qardAccount.getId()).orElse(qardAccount));
    }

    public QardHasanAccountResponse createQardLoan(CreateQardLoanRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));
        IslamicProductTemplate islamicProduct = resolveActiveQardProduct(request.getProductCode());
        productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        Account settlementAccount = accountRepository.findById(request.getSettlementAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getSettlementAccountId()));
        if (settlementAccount.getCustomer() == null
                || !settlementAccount.getCustomer().getId().equals(request.getCustomerId())) {
            throw new BusinessException("Settlement account must belong to the Qard customer",
                    "INVALID_SETTLEMENT_ACCOUNT");
        }
        validateCurrency(islamicProduct, request.getCurrencyCode(), settlementAccount.getCurrencyCode());
        validateAdminFee(request.getPrincipalAmount(), request.getAdminFeeAmount(), request.getAdminFeeJustification());

        Account qardLoanAccount = createBaseAccount(
                customer,
                request.getProductCode(),
                request.getCurrencyCode(),
                request.getBranchCode(),
                "Qard Hasan Loan - " + customer.getDisplayName()
        );

        String contractReference = generateContractReference("QRD-LON");
        QardHasanAccount qardLoan = QardHasanAccount.builder()
                .account(qardLoanAccount)
                .qardType(QardDomainEnums.QardType.LENDING_QARD)
                .contractReference(contractReference)
                .contractSignedDate(LocalDate.now())
                .islamicProductTemplateId(islamicProduct.getId())
                .contractTypeCode("QARD")
                .principalGuaranteed(true)
                .noReturnDisclosed(true)
                .principalAmount(request.getPrincipalAmount().setScale(2, RoundingMode.HALF_UP))
                .outstandingPrincipal(request.getPrincipalAmount().setScale(2, RoundingMode.HALF_UP))
                .disbursementDate(LocalDate.now())
                .maturityDate(resolveMaturityDate(request))
                .repaymentFrequency(resolveRepaymentFrequency(request))
                .installmentAmount(resolveInstallmentAmount(request))
                .totalInstallments(resolveInstallmentCount(request))
                .completedInstallments(0)
                .missedInstallments(0)
                .adminFeeCharged(request.getAdminFeeAmount() != null && request.getAdminFeeAmount().compareTo(BigDecimal.ZERO) > 0)
                .adminFeeAmount(defaultAmount(request.getAdminFeeAmount()))
                .adminFeeJustification(request.getAdminFeeJustification())
                .purpose(request.getPurpose())
                .purposeDescription(request.getPurposeDescription())
                .qardStatus(QardDomainEnums.QardStatus.ACTIVE)
                .settlementAccountId(settlementAccount.getId())
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();
        qardLoan = qardHasanAccountRepository.save(qardLoan);

        List<QardRepaymentSchedule> schedule = buildRepaymentSchedule(qardLoan);
        qardRepaymentScheduleRepository.saveAll(schedule);

        // Credit the customer's settlement account and recognise the Qard receivable.
        accountPostingService.postCreditAgainstGl(
                settlementAccount,
                TransactionType.CREDIT,
                request.getPrincipalAmount(),
                "Qard Hasan loan disbursement",
                TransactionChannel.SYSTEM,
                contractReference + ":DISB",
                List.of(accountPostingService.balanceLeg(
                        qardLoanAccount.getProduct().getGlAccountCode(),
                        AccountPostingService.EntrySide.DEBIT,
                        request.getPrincipalAmount(),
                        settlementAccount.getCurrencyCode(),
                        BigDecimal.ONE,
                        "Qard Hasan receivable",
                        qardLoanAccount.getId(),
                        customer.getId()
                )),
                "QARD",
                contractReference
        );

        // Mirror the outstanding receivable on the linked Qard account record.
        qardLoanAccount.credit(request.getPrincipalAmount());
        accountRepository.save(qardLoanAccount);

        log.info("Qard Hasan loan created: contractRef={}, accountId={}, principal={}",
                contractReference, qardLoanAccount.getId(), request.getPrincipalAmount());
        return toResponse(qardHasanAccountRepository.findById(qardLoan.getId()).orElse(qardLoan));
    }

    @Transactional(readOnly = true)
    public QardHasanAccountResponse getQardAccount(Long accountId) {
        return toResponse(findByAccountId(accountId));
    }

    @Transactional(readOnly = true)
    public List<QardHasanAccountResponse> getCustomerQardAccounts(Long customerId) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        return qardHasanAccountRepository.findByCustomerId(customerId).stream()
                .map(this::toResponse)
                .toList();
    }

    public TransactionResponse depositToQardAccount(Long accountId, QardTransactionRequest request) {
        QardHasanAccount qardAccount = findByAccountId(accountId);
        if (qardAccount.getQardType() != QardDomainEnums.QardType.DEPOSIT_QARD) {
            throw new BusinessException("Deposits are only supported for deposit-based Qard accounts",
                    "INVALID_QARD_OPERATION");
        }

        TransactionJournal journal = accountPostingService.postCreditAgainstGl(
                qardAccount.getAccount(),
                TransactionType.CREDIT,
                request.getAmount(),
                StringUtils.hasText(request.getNarration()) ? request.getNarration() : "Qard Hasan deposit",
                parseChannel(request.getChannel()),
                request.getExternalRef(),
                CASH_GL,
                "QARD",
                qardAccount.getContractReference()
        );
        return toTransactionResponse(journal);
    }

    public TransactionResponse withdrawFromQardAccount(Long accountId, QardTransactionRequest request) {
        QardHasanAccount qardAccount = findByAccountId(accountId);
        if (qardAccount.getQardType() != QardDomainEnums.QardType.DEPOSIT_QARD) {
            throw new BusinessException("Withdrawals are only supported for deposit-based Qard accounts",
                    "INVALID_QARD_OPERATION");
        }

        TransactionJournal journal = accountPostingService.postDebitAgainstGl(
                qardAccount.getAccount(),
                TransactionType.DEBIT,
                request.getAmount(),
                StringUtils.hasText(request.getNarration()) ? request.getNarration() : "Qard Hasan withdrawal",
                parseChannel(request.getChannel()),
                request.getExternalRef(),
                CASH_GL,
                "QARD",
                qardAccount.getContractReference()
        );
        return toTransactionResponse(journal);
    }

    @Transactional(readOnly = true)
    public List<QardRepaymentSchedule> getRepaymentSchedule(Long accountId) {
        QardHasanAccount qardAccount = findByAccountId(accountId);
        if (qardAccount.getQardType() != QardDomainEnums.QardType.LENDING_QARD) {
            throw new BusinessException("Repayment schedule is only available for lending Qard accounts",
                    "INVALID_QARD_OPERATION");
        }
        return qardRepaymentScheduleRepository.findByQardAccountIdOrderByInstallmentNumberAsc(qardAccount.getId());
    }

    public TransactionResponse processRepayment(Long accountId, QardRepaymentRequest request) {
        QardHasanAccount qardAccount = findByAccountId(accountId);
        if (qardAccount.getQardType() != QardDomainEnums.QardType.LENDING_QARD) {
            throw new BusinessException("Repayment is only available for lending Qard accounts",
                    "INVALID_QARD_OPERATION");
        }
        if (request.getAmount().compareTo(defaultAmount(qardAccount.getOutstandingPrincipal())) > 0) {
            throw new BusinessException("Qard repayments cannot exceed the outstanding principal",
                    "REPAYMENT_EXCEEDS_OUTSTANDING");
        }

        TransactionJournal journal;
        if (request.getSourceAccountId() != null) {
            Account sourceAccount = accountRepository.findById(request.getSourceAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getSourceAccountId()));
            journal = accountPostingService.postDebitAgainstGl(
                    sourceAccount,
                    TransactionType.DEBIT,
                    request.getAmount(),
                    StringUtils.hasText(request.getNarration()) ? request.getNarration() : "Qard Hasan repayment",
                    TransactionChannel.SYSTEM,
                    request.getExternalRef(),
                    List.of(accountPostingService.balanceLeg(
                            qardAccount.getAccount().getProduct().getGlAccountCode(),
                            AccountPostingService.EntrySide.CREDIT,
                            request.getAmount(),
                            sourceAccount.getCurrencyCode(),
                            BigDecimal.ONE,
                            "Qard Hasan receivable reduction",
                            qardAccount.getAccount().getId(),
                            qardAccount.getAccount().getCustomer() != null ? qardAccount.getAccount().getCustomer().getId() : null
                    )),
                    "QARD",
                    qardAccount.getContractReference()
            );
            qardAccount.getAccount().debit(request.getAmount());
            accountRepository.save(qardAccount.getAccount());
        } else {
            journal = accountPostingService.postDebitAgainstGl(
                    qardAccount.getAccount(),
                    TransactionType.DEBIT,
                    request.getAmount(),
                    StringUtils.hasText(request.getNarration()) ? request.getNarration() : "Qard Hasan cash repayment",
                    TransactionChannel.BRANCH,
                    request.getExternalRef(),
                    List.of(accountPostingService.balanceLeg(
                            CASH_GL,
                            AccountPostingService.EntrySide.DEBIT,
                            request.getAmount(),
                            qardAccount.getAccount().getCurrencyCode(),
                            BigDecimal.ONE,
                            "Qard Hasan cash receipt",
                            null,
                            null
                    )),
                    "QARD",
                    qardAccount.getContractReference()
            );
        }

        applyRepaymentToSchedule(qardAccount, request.getAmount(), journal.getTransactionRef());
        return toTransactionResponse(journal);
    }

    public void processDefaultedQard(Long accountId, String reason) {
        QardHasanAccount qardAccount = findByAccountId(accountId);
        if (qardAccount.getQardType() != QardDomainEnums.QardType.LENDING_QARD) {
            throw new BusinessException("Default processing is only available for lending Qard accounts",
                    "INVALID_QARD_OPERATION");
        }
        qardAccount.setQardStatus(QardDomainEnums.QardStatus.DEFAULTED);
        qardAccount.setPurposeDescription(appendReason(qardAccount.getPurposeDescription(), "Default reason", reason));
        qardHasanAccountRepository.save(qardAccount);
    }

    public void writeOffQard(Long accountId, String approvedBy, String reason) {
        QardHasanAccount qardAccount = findByAccountId(accountId);
        if (qardAccount.getQardType() != QardDomainEnums.QardType.LENDING_QARD) {
            throw new BusinessException("Write-off is only available for lending Qard accounts",
                    "INVALID_QARD_OPERATION");
        }
        BigDecimal outstanding = defaultAmount(qardAccount.getOutstandingPrincipal());
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("There is no outstanding Qard balance to write off",
                    "NOTHING_TO_WRITE_OFF");
        }

        accountPostingService.postDebitAgainstGl(
                qardAccount.getAccount(),
                TransactionType.ADJUSTMENT,
                outstanding,
                "Qard Hasan write-off",
                TransactionChannel.SYSTEM,
                qardAccount.getContractReference() + ":WOFF",
                List.of(accountPostingService.balanceLeg(
                        QARD_WRITE_OFF_EXPENSE_GL,
                        AccountPostingService.EntrySide.DEBIT,
                        outstanding,
                        qardAccount.getAccount().getCurrencyCode(),
                        BigDecimal.ONE,
                        "Qard Hasan write-off expense",
                        null,
                        null
                )),
                "QARD",
                qardAccount.getContractReference()
        );

        qardAccount.setOutstandingPrincipal(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        qardAccount.setQardStatus(QardDomainEnums.QardStatus.WRITTEN_OFF);
        qardAccount.setPurposeDescription(appendReason(qardAccount.getPurposeDescription(),
                "Write-off approved by " + approvedBy, reason));
        qardHasanAccountRepository.save(qardAccount);
    }

    @Transactional(readOnly = true)
    public QardPortfolioSummary getPortfolioSummary() {
        List<QardHasanAccount> accounts = qardHasanAccountRepository.findAll();
        List<QardHasanAccount> depositAccounts = accounts.stream()
                .filter(item -> item.getQardType() == QardDomainEnums.QardType.DEPOSIT_QARD)
                .toList();
        List<QardHasanAccount> loanAccounts = accounts.stream()
                .filter(item -> item.getQardType() == QardDomainEnums.QardType.LENDING_QARD)
                .toList();

        BigDecimal totalDeposits = depositAccounts.stream()
                .map(item -> item.getAccount().getBookBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOutstanding = loanAccounts.stream()
                .map(item -> defaultAmount(item.getOutstandingPrincipal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPrincipal = loanAccounts.stream()
                .map(item -> defaultAmount(item.getPrincipalAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal recovered = totalPrincipal.subtract(totalOutstanding);
        BigDecimal repaymentRate = totalPrincipal.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : recovered.multiply(BigDecimal.valueOf(100))
                .divide(totalPrincipal, 2, RoundingMode.HALF_UP);
        long defaulted = loanAccounts.stream()
                .filter(item -> item.getQardStatus() == QardDomainEnums.QardStatus.DEFAULTED
                        || item.getQardStatus() == QardDomainEnums.QardStatus.WRITTEN_OFF)
                .count();
        BigDecimal defaultRate = loanAccounts.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(defaulted * 100.0 / loanAccounts.size()).setScale(2, RoundingMode.HALF_UP);

        return QardPortfolioSummary.builder()
                .totalQardDepositAccounts(depositAccounts.size())
                .totalQardLoanAccounts(loanAccounts.size())
                .totalQardDeposits(totalDeposits.setScale(2, RoundingMode.HALF_UP))
                .totalQardLoansOutstanding(totalOutstanding.setScale(2, RoundingMode.HALF_UP))
                .repaymentRatePct(repaymentRate)
                .defaultRatePct(defaultRate)
                .build();
    }

    @Transactional(readOnly = true)
    public List<QardHasanAccountResponse> getOverdueQardLoans() {
        List<Long> overdueAccountIds = qardRepaymentScheduleRepository
                .findByStatusAndDueDateBefore(QardDomainEnums.ScheduleStatus.PENDING, LocalDate.now())
                .stream()
                .map(QardRepaymentSchedule::getQardAccountId)
                .distinct()
                .toList();
        return overdueAccountIds.stream()
                .map(id -> qardHasanAccountRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("QardHasanAccount", "id", id)))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QardHasanAccountResponse> getQardLoansMaturing(LocalDate fromDate, LocalDate toDate) {
        return qardHasanAccountRepository.findByMaturityDateBetween(fromDate, toDate).stream()
                .map(this::toResponse)
                .toList();
    }

    private Account createBaseAccount(Customer customer, String productCode, String currencyCode,
                                      String branchCode, String accountName) {
        var accountResponse = accountService.openAccount(OpenAccountRequest.builder()
                .customerId(customer.getId())
                .productCode(productCode)
                .currencyCode(currencyCode)
                .accountType(resolveAccountType(customer))
                .accountName(accountName)
                .branchCode(branchCode)
                .statementFrequency("MONTHLY")
                .initialDeposit(BigDecimal.ZERO)
                .build());
        return accountRepository.findById(accountResponse.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountResponse.getId()));
    }

    private void ensureKycVerified(Long customerId) {
        if (customerIdentificationRepository.findVerifiedByCustomerId(customerId).isEmpty()) {
            throw new BusinessException("Customer KYC must be VERIFIED before opening a Qard deposit account",
                    "KYC_NOT_VERIFIED");
        }
    }

    private IslamicProductTemplate resolveActiveQardProduct(String productCode) {
        IslamicProductTemplate product = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        if (product.getContractType() == null || !"QARD".equalsIgnoreCase(product.getContractType().getCode())) {
            throw new BusinessException("Selected product is not a Qard product", "INVALID_QARD_PRODUCT");
        }
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            throw new BusinessException("Islamic product must be ACTIVE", "PRODUCT_NOT_ACTIVE");
        }
        if (Boolean.TRUE.equals(product.getFatwaRequired()) && product.getActiveFatwaId() == null) {
            throw new BusinessException("Islamic product requires an active fatwa before it can be used",
                    "ACTIVE_FATWA_REQUIRED");
        }
        if (product.getProfitCalculationMethod() != IslamicDomainEnums.ProfitCalculationMethod.NONE) {
            throw new BusinessException("Qard products must not define contractual profit calculation",
                    "INVALID_QARD_PROFIT_METHOD");
        }
        if (parameterAsBoolean(product.getId(), "profitContractuallyPromised", false)) {
            throw new BusinessException("Qard products cannot promise returns", "SHARIAH_QRD_001");
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
            throw new BusinessException("Selected currency is not enabled for this Qard product",
                    "INVALID_PRODUCT_CURRENCY");
        }
    }

    private void validateAdminFee(BigDecimal principalAmount, BigDecimal adminFeeAmount, String justification) {
        if (adminFeeAmount == null || adminFeeAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        if (!StringUtils.hasText(justification)) {
            throw new BusinessException("Qard admin fee requires documented justification of actual cost",
                    "ADMIN_FEE_JUSTIFICATION_REQUIRED");
        }
        if (adminFeeAmount.compareTo(principalAmount) >= 0) {
            throw new BusinessException("Qard admin fee must be a flat recovery of actual cost, not a proxy for profit",
                    "INVALID_ADMIN_FEE");
        }
    }

    private LocalDate resolveMaturityDate(CreateQardLoanRequest request) {
        if (request.getMaturityDate() != null) {
            return request.getMaturityDate();
        }
        if (request.getTotalInstallments() != null && request.getTotalInstallments() > 0) {
            return LocalDate.now().plusMonths(request.getTotalInstallments());
        }
        return LocalDate.now().plusMonths(1);
    }

    private QardDomainEnums.RepaymentFrequency resolveRepaymentFrequency(CreateQardLoanRequest request) {
        return request.getRepaymentFrequency() != null
                ? request.getRepaymentFrequency()
                : QardDomainEnums.RepaymentFrequency.MONTHLY;
    }

    private Integer resolveInstallmentCount(CreateQardLoanRequest request) {
        if (request.getTotalInstallments() != null && request.getTotalInstallments() > 0) {
            return request.getTotalInstallments();
        }
        if (request.getInstallmentAmount() != null && request.getInstallmentAmount().compareTo(BigDecimal.ZERO) > 0) {
            return request.getPrincipalAmount()
                    .divide(request.getInstallmentAmount(), 0, RoundingMode.CEILING)
                    .intValue();
        }
        return 1;
    }

    private BigDecimal resolveInstallmentAmount(CreateQardLoanRequest request) {
        if (request.getInstallmentAmount() != null && request.getInstallmentAmount().compareTo(BigDecimal.ZERO) > 0) {
            return request.getInstallmentAmount().setScale(2, RoundingMode.HALF_UP);
        }
        return request.getPrincipalAmount()
                .divide(BigDecimal.valueOf(resolveInstallmentCount(request)), 2, RoundingMode.HALF_UP);
    }

    private List<QardRepaymentSchedule> buildRepaymentSchedule(QardHasanAccount qardLoan) {
        List<QardRepaymentSchedule> rows = new ArrayList<>();
        BigDecimal outstanding = defaultAmount(qardLoan.getPrincipalAmount()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal installment = defaultAmount(qardLoan.getInstallmentAmount()).setScale(2, RoundingMode.HALF_UP);
        LocalDate dueDate = qardLoan.getDisbursementDate() != null ? qardLoan.getDisbursementDate() : LocalDate.now();

        for (int i = 1; i <= qardLoan.getTotalInstallments(); i++) {
            BigDecimal principalForRow = i == qardLoan.getTotalInstallments() ? outstanding : installment.min(outstanding);
            dueDate = nextDueDate(dueDate, qardLoan.getRepaymentFrequency());
            rows.add(QardRepaymentSchedule.builder()
                    .qardAccountId(qardLoan.getId())
                    .installmentNumber(i)
                    .dueDate(i == qardLoan.getTotalInstallments() && qardLoan.getMaturityDate() != null
                            ? qardLoan.getMaturityDate()
                            : dueDate)
                    .principalAmount(principalForRow)
                    .paidAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .status(QardDomainEnums.ScheduleStatus.PENDING)
                    .build());
            outstanding = outstanding.subtract(principalForRow);
        }
        return rows;
    }

    private LocalDate nextDueDate(LocalDate baseDate, QardDomainEnums.RepaymentFrequency frequency) {
        return switch (frequency) {
            case QUARTERLY -> baseDate.plusMonths(3);
            case LUMP_SUM -> baseDate.plusMonths(1);
            case ON_DEMAND -> baseDate;
            default -> baseDate.plusMonths(1);
        };
    }

    private void applyRepaymentToSchedule(QardHasanAccount qardAccount, BigDecimal amount, String transactionRef) {
        BigDecimal remaining = amount.setScale(2, RoundingMode.HALF_UP);
        List<QardRepaymentSchedule> rows = qardRepaymentScheduleRepository
                .findByQardAccountIdOrderByInstallmentNumberAsc(qardAccount.getId());

        for (QardRepaymentSchedule row : rows) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            if (row.getStatus() == QardDomainEnums.ScheduleStatus.PAID
                    || row.getStatus() == QardDomainEnums.ScheduleStatus.WAIVED) {
                continue;
            }

            BigDecimal outstandingRow = row.getPrincipalAmount().subtract(defaultAmount(row.getPaidAmount()));
            BigDecimal allocation = remaining.min(outstandingRow);
            row.setPaidAmount(defaultAmount(row.getPaidAmount()).add(allocation).setScale(2, RoundingMode.HALF_UP));
            row.setPaidDate(LocalDate.now());
            row.setTransactionRef(transactionRef);
            row.setStatus(row.getPaidAmount().compareTo(row.getPrincipalAmount()) >= 0
                    ? QardDomainEnums.ScheduleStatus.PAID
                    : QardDomainEnums.ScheduleStatus.PARTIAL);
            remaining = remaining.subtract(allocation);
        }
        qardRepaymentScheduleRepository.saveAll(rows);

        BigDecimal updatedOutstanding = defaultAmount(qardAccount.getOutstandingPrincipal()).subtract(amount);
        if (updatedOutstanding.compareTo(BigDecimal.ZERO) < 0) {
            updatedOutstanding = BigDecimal.ZERO;
        }
        qardAccount.setOutstandingPrincipal(updatedOutstanding.setScale(2, RoundingMode.HALF_UP));
        qardAccount.setLastRepaymentDate(LocalDate.now());
        qardAccount.setLastRepaymentAmount(amount.setScale(2, RoundingMode.HALF_UP));
        int completedInstallments = (int) rows.stream()
                .filter(item -> item.getStatus() == QardDomainEnums.ScheduleStatus.PAID)
                .count();
        qardAccount.setCompletedInstallments(completedInstallments);
        qardAccount.setQardStatus(updatedOutstanding.compareTo(BigDecimal.ZERO) == 0
                ? QardDomainEnums.QardStatus.FULLY_REPAID
                : QardDomainEnums.QardStatus.REPAYING);
        qardHasanAccountRepository.save(qardAccount);
    }

    private QardHasanAccount findByAccountId(Long accountId) {
        return qardHasanAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("QardHasanAccount", "accountId", accountId));
    }

    private AccountType resolveAccountType(Customer customer) {
        return switch (customer.getCustomerType()) {
            case SME -> AccountType.SME;
            case CORPORATE, GOVERNMENT, NGO -> AccountType.CORPORATE;
            case TRUST -> AccountType.TRUST;
            default -> AccountType.INDIVIDUAL;
        };
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

    private BigDecimal defaultAmount(BigDecimal value) {
        return value != null ? value.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private String appendReason(String existing, String label, String reason) {
        if (!StringUtils.hasText(reason)) {
            return existing;
        }
        String prefix = StringUtils.hasText(existing) ? existing + System.lineSeparator() : "";
        return prefix + label + ": " + reason;
    }

    private String generateContractReference(String prefix) {
        return prefix + "-" + LocalDate.now().getYear() + "-" + String.format("%06d", CONTRACT_SEQ.incrementAndGet());
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

    private QardHasanAccountResponse toResponse(QardHasanAccount qardAccount) {
        Account account = qardAccount.getAccount();
        return QardHasanAccountResponse.builder()
                .id(qardAccount.getId())
                .accountId(account.getId())
                .accountNumber(account.getAccountNumber())
                .customerId(account.getCustomer() != null ? account.getCustomer().getId() : null)
                .customerName(account.getCustomer() != null ? account.getCustomer().getDisplayName() : null)
                .productCode(account.getProduct() != null ? account.getProduct().getCode() : null)
                .currencyCode(account.getCurrencyCode())
                .contractReference(qardAccount.getContractReference())
                .contractSignedDate(qardAccount.getContractSignedDate())
                .qardType(qardAccount.getQardType().name())
                .principalGuaranteed(qardAccount.getPrincipalGuaranteed())
                .noReturnDisclosed(qardAccount.getNoReturnDisclosed())
                .principalAmount(qardAccount.getPrincipalAmount())
                .outstandingPrincipal(qardAccount.getOutstandingPrincipal())
                .disbursementDate(qardAccount.getDisbursementDate())
                .maturityDate(qardAccount.getMaturityDate())
                .repaymentFrequency(qardAccount.getRepaymentFrequency() != null ? qardAccount.getRepaymentFrequency().name() : null)
                .installmentAmount(qardAccount.getInstallmentAmount())
                .totalInstallments(qardAccount.getTotalInstallments())
                .completedInstallments(qardAccount.getCompletedInstallments())
                .missedInstallments(qardAccount.getMissedInstallments())
                .adminFeeCharged(qardAccount.getAdminFeeCharged())
                .adminFeeAmount(qardAccount.getAdminFeeAmount())
                .adminFeeJustification(qardAccount.getAdminFeeJustification())
                .purpose(qardAccount.getPurpose() != null ? qardAccount.getPurpose().name() : null)
                .purposeDescription(qardAccount.getPurposeDescription())
                .qardStatus(qardAccount.getQardStatus().name())
                .lastRepaymentDate(qardAccount.getLastRepaymentDate())
                .lastRepaymentAmount(qardAccount.getLastRepaymentAmount())
                .accountBalance(account.getBookBalance())
                .build();
    }
}
