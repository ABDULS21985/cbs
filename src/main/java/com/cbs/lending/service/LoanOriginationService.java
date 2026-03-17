package com.cbs.lending.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.credit.dto.CreditDecisionResponse;
import com.cbs.credit.engine.CreditDecisionEngine;
import com.cbs.credit.entity.CreditDecision;
import com.cbs.credit.entity.CreditDecisionLog;
import com.cbs.credit.entity.CreditScoringModel;
import com.cbs.credit.repository.CreditDecisionLogRepository;
import com.cbs.credit.repository.CreditScoringModelRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.lending.dto.*;
import com.cbs.lending.engine.RepaymentScheduleGenerator;
import com.cbs.lending.entity.*;
import com.cbs.lending.repository.*;
import com.cbs.provider.interest.DayCountEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LoanOriginationService {

    private final LoanApplicationRepository applicationRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final LoanProductRepository productRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final CollateralRepository collateralRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CreditScoringModelRepository scoringModelRepository;
    private final CreditDecisionLogRepository decisionLogRepository;
    private final CreditDecisionEngine creditEngine;
    private final RepaymentScheduleGenerator scheduleGenerator;
    private final DayCountEngine dayCountEngine;
    private final CbsProperties cbsProperties;
    private final CurrentActorProvider currentActorProvider;

    // ========================================================================
    // APPLICATION WORKFLOW
    // ========================================================================

    @Transactional
    public LoanApplicationResponse submitApplication(LoanApplicationRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));

        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Customer is not active", "CUSTOMER_NOT_ACTIVE");
        }

        LoanProduct product = productRepository.findByCode(request.getLoanProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("LoanProduct", "code", request.getLoanProductCode()));

        validateApplicationAgainstProduct(request, product);

        Long seq = applicationRepository.getNextApplicationSequence();
        String appNumber = String.format("LA%012d", seq);

        LoanApplication application = LoanApplication.builder()
                .applicationNumber(appNumber)
                .customer(customer)
                .loanProduct(product)
                .requestedAmount(request.getRequestedAmount())
                .currencyCode(product.getCurrencyCode())
                .requestedTenureMonths(request.getRequestedTenureMonths())
                .purpose(request.getPurpose())
                .proposedRate(request.getProposedRate() != null ? request.getProposedRate() : product.getDefaultInterestRate())
                .rateType(request.getRateType() != null ? request.getRateType() : "FIXED")
                .repaymentScheduleType(request.getRepaymentScheduleType() != null ?
                        request.getRepaymentScheduleType() : RepaymentScheduleType.EQUAL_INSTALLMENT)
                .repaymentFrequency(request.getRepaymentFrequency() != null ?
                        request.getRepaymentFrequency() : "MONTHLY")
                .isIslamic(request.getIsIslamic() != null ? request.getIsIslamic() : product.getIsIslamic())
                .islamicStructure(request.getIslamicStructure())
                .assetDescription(request.getAssetDescription())
                .assetCost(request.getAssetCost())
                .profitRate(request.getProfitRate())
                .status(LoanApplicationStatus.SUBMITTED)
                .submittedAt(Instant.now())
                .build();

        if (request.getDisbursementAccountId() != null) {
            application.setDisbursementAccount(accountRepository.findById(request.getDisbursementAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getDisbursementAccountId())));
        }
        if (request.getRepaymentAccountId() != null) {
            application.setRepaymentAccount(accountRepository.findById(request.getRepaymentAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getRepaymentAccountId())));
        }

        LoanApplication saved = applicationRepository.save(application);

        // Auto-run credit check if requested
        if (Boolean.TRUE.equals(request.getRunCreditCheck())) {
            runCreditCheck(saved.getId());
        }

        log.info("Loan application submitted: number={}, amount={}, product={}, customer={}",
                appNumber, request.getRequestedAmount(), product.getCode(), customer.getCifNumber());

        return toApplicationResponse(saved);
    }

    public LoanApplicationResponse getApplication(Long id) {
        LoanApplication app = applicationRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("LoanApplication", "id", id));
        return toApplicationResponse(app);
    }

    public Page<LoanApplicationResponse> getCustomerApplications(Long customerId, Pageable pageable) {
        return applicationRepository.findByCustomerId(customerId, pageable).map(this::toApplicationResponse);
    }

    @Transactional
    public CreditDecisionResponse runCreditCheck(Long applicationId) {
        LoanApplication app = applicationRepository.findByIdWithDetails(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanApplication", "id", applicationId));

        app.setStatus(LoanApplicationStatus.CREDIT_CHECK);
        applicationRepository.save(app);

        CreditScoringModel model = scoringModelRepository
                .findByTargetSegmentAndIsActiveTrue(app.getLoanProduct().getTargetSegment())
                .stream().findFirst()
                .orElse(scoringModelRepository.findByModelCode("DEFAULT")
                        .orElseThrow(() -> new BusinessException("No active scoring model found", "NO_SCORING_MODEL")));

        CreditDecisionEngine.DecisionResult result = creditEngine.evaluate(
                app, app.getCustomer(), app.getLoanProduct(), model);

        // Store decision log
        CreditDecisionLog decisionLog = CreditDecisionLog.builder()
                .application(app).customer(app.getCustomer())
                .modelCode(model.getModelCode())
                .inputData(result.getInputData())
                .score(result.getScore()).riskGrade(result.getRiskGrade())
                .decision(result.getDecision())
                .decisionReasons(result.getDecisionReasons())
                .recommendedAmount(result.getRecommendedAmount())
                .recommendedRate(result.getRecommendedRate())
                .recommendedTenure(result.getRecommendedTenure())
                .executionTimeMs(result.getExecutionTimeMs())
                .build();
        decisionLogRepository.save(decisionLog);

        // Update application with results
        app.setCreditScore(result.getScore());
        app.setRiskGrade(result.getRiskGrade());
        app.setDebtToIncomeRatio(result.getDebtToIncomeRatio());
        app.setDecisionEngineResult(new HashMap<>(result.getInputData()));
        app.getDecisionEngineResult().put("decision", result.getDecision().name());
        app.getDecisionEngineResult().put("score", result.getScore());

        if (result.getDecision() == CreditDecision.DECLINE) {
            app.setStatus(LoanApplicationStatus.DECLINED);
            app.setDeclineReason(String.join("; ", result.getDecisionReasons()));
        } else {
            app.setStatus(LoanApplicationStatus.UNDER_REVIEW);
        }
        applicationRepository.save(app);

        return CreditDecisionResponse.builder()
                .id(decisionLog.getId()).applicationId(app.getId())
                .applicationNumber(app.getApplicationNumber())
                .customerId(app.getCustomer().getId())
                .modelCode(model.getModelCode())
                .score(result.getScore()).riskGrade(result.getRiskGrade())
                .decision(result.getDecision())
                .decisionReasons(result.getDecisionReasons())
                .recommendedAmount(result.getRecommendedAmount())
                .recommendedRate(result.getRecommendedRate())
                .recommendedTenure(result.getRecommendedTenure())
                .executedAt(decisionLog.getExecutedAt())
                .executionTimeMs(result.getExecutionTimeMs())
                .build();
    }

    @Transactional
    public LoanApplicationResponse approveApplication(Long applicationId, LoanApprovalRequest approval) {
        LoanApplication app = applicationRepository.findByIdWithDetails(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanApplication", "id", applicationId));

        if (app.getStatus() != LoanApplicationStatus.UNDER_REVIEW &&
                app.getStatus() != LoanApplicationStatus.CREDIT_CHECK) {
            throw new BusinessException("Application is not in a reviewable state: " + app.getStatus(),
                    "INVALID_APPLICATION_STATE");
        }

        String approvedBy = currentActorProvider.getCurrentActor();
        app.setApprovedAmount(approval.getApprovedAmount());
        app.setApprovedTenureMonths(approval.getApprovedTenureMonths());
        app.setApprovedRate(approval.getApprovedRate());
        app.setConditions(approval.getConditions() != null ? approval.getConditions() : List.of());
        app.setStatus(LoanApplicationStatus.APPROVED);
        app.setApprovedBy(approvedBy);
        app.setApprovedAt(Instant.now());

        applicationRepository.save(app);
        log.info("Loan application approved: number={}, amount={}, rate={}%, tenure={}m, by={}",
                app.getApplicationNumber(), approval.getApprovedAmount(), approval.getApprovedRate(),
                approval.getApprovedTenureMonths(), approvedBy);

        return toApplicationResponse(app);
    }

    @Transactional
    public LoanApplicationResponse declineApplication(Long applicationId, String reason) {
        LoanApplication app = applicationRepository.findByIdWithDetails(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanApplication", "id", applicationId));

        String declinedBy = currentActorProvider.getCurrentActor();
        app.setStatus(LoanApplicationStatus.DECLINED);
        app.setDeclineReason(reason);
        app.setReviewedBy(declinedBy);
        app.setReviewedAt(Instant.now());
        applicationRepository.save(app);

        log.info("Loan application declined: number={}, reason={}", app.getApplicationNumber(), reason);
        return toApplicationResponse(app);
    }

    // ========================================================================
    // DISBURSEMENT
    // ========================================================================

    @Transactional
    public LoanAccountResponse disburse(Long applicationId) {
        LoanApplication app = applicationRepository.findByIdWithDetails(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanApplication", "id", applicationId));

        if (app.getStatus() != LoanApplicationStatus.APPROVED &&
                app.getStatus() != LoanApplicationStatus.OFFER_ACCEPTED) {
            throw new BusinessException("Application must be approved before disbursement", "NOT_APPROVED");
        }

        if (app.getDisbursementAccount() == null) {
            throw new BusinessException("Disbursement account is not set", "NO_DISBURSEMENT_ACCOUNT");
        }

        Long seq = loanAccountRepository.getNextLoanSequence();
        String loanNumber = String.format("LN%012d", seq);
        LocalDate disbursementDate = LocalDate.now();
        LocalDate firstRepaymentDate = disbursementDate.plusMonths(1);
        LocalDate maturityDate = disbursementDate.plusMonths(app.getApprovedTenureMonths());

        BigDecimal emi = scheduleGenerator.calculateEmi(
                app.getApprovedAmount(), app.getApprovedRate(), app.getApprovedTenureMonths());

        LoanAccount loanAccount = LoanAccount.builder()
                .loanNumber(loanNumber)
                .application(app)
                .customer(app.getCustomer())
                .loanProduct(app.getLoanProduct())
                .disbursementAccount(app.getDisbursementAccount())
                .repaymentAccount(app.getRepaymentAccount() != null ? app.getRepaymentAccount() : app.getDisbursementAccount())
                .currencyCode(app.getCurrencyCode())
                .sanctionedAmount(app.getApprovedAmount())
                .disbursedAmount(app.getApprovedAmount())
                .outstandingPrincipal(app.getApprovedAmount())
                .interestRate(app.getApprovedRate())
                .rateType(app.getRateType())
                .dayCountConvention(cbsProperties.getInterest().getDayCountConvention())
                .repaymentScheduleType(app.getRepaymentScheduleType())
                .repaymentFrequency(app.getRepaymentFrequency())
                .tenureMonths(app.getApprovedTenureMonths())
                .totalInstallments(app.getApprovedTenureMonths())
                .nextDueDate(firstRepaymentDate)
                .emiAmount(emi)
                .isIslamic(app.getIsIslamic())
                .islamicStructure(app.getIslamicStructure())
                .disbursementDate(disbursementDate)
                .firstRepaymentDate(firstRepaymentDate)
                .maturityDate(maturityDate)
                .status(LoanAccountStatus.ACTIVE)
                .build();

        // For Islamic finance (Murabaha): total profit = cost price markup
        if (Boolean.TRUE.equals(app.getIsIslamic()) && app.getAssetCost() != null && app.getProfitRate() != null) {
            BigDecimal totalProfit = app.getAssetCost().multiply(app.getProfitRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            loanAccount.setTotalProfit(totalProfit);
        }

        LoanAccount savedLoan = loanAccountRepository.save(loanAccount);

        // Generate repayment schedule
        List<LoanRepaymentSchedule> schedule = scheduleGenerator.generate(
                app.getApprovedAmount(), app.getApprovedRate(),
                app.getApprovedTenureMonths(), app.getRepaymentScheduleType(), firstRepaymentDate);

        for (LoanRepaymentSchedule entry : schedule) {
            savedLoan.addScheduleEntry(entry);
        }
        loanAccountRepository.save(savedLoan);

        // Credit disbursement account
        Account disbAccount = app.getDisbursementAccount();
        accountPostingService.postCredit(
                disbAccount,
                TransactionType.CREDIT,
                app.getApprovedAmount(),
                "Loan disbursement " + loanNumber,
                TransactionChannel.SYSTEM,
                "LOAN:" + loanNumber + ":DISBURSE");

        // Update application status
        app.setStatus(LoanApplicationStatus.DISBURSED);
        applicationRepository.save(app);

        log.info("Loan disbursed: number={}, amount={}, tenure={}m, EMI={}, schedule={}",
                loanNumber, app.getApprovedAmount(), app.getApprovedTenureMonths(), emi,
                app.getRepaymentScheduleType());

        return toLoanAccountResponse(savedLoan);
    }

    // ========================================================================
    // LOAN ACCOUNT QUERIES
    // ========================================================================

    public LoanAccountResponse getLoanAccount(Long id) {
        LoanAccount loan = loanAccountRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", "id", id));
        return toLoanAccountResponse(loan);
    }

    public LoanAccountResponse getLoanByNumber(String loanNumber) {
        LoanAccount loan = loanAccountRepository.findByLoanNumber(loanNumber)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", "loanNumber", loanNumber));
        return toLoanAccountResponse(loan);
    }

    public Page<LoanAccountResponse> getCustomerLoans(Long customerId, Pageable pageable) {
        return loanAccountRepository.findByCustomerId(customerId, pageable).map(this::toLoanAccountResponse);
    }

    // ========================================================================
    // INTEREST ACCRUAL
    // ========================================================================

    @Transactional
    public BigDecimal accrueInterest(Long loanId) {
        LoanAccount loan = loanAccountRepository.findByIdWithDetails(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", "id", loanId));

        if (!loan.isActive()) return BigDecimal.ZERO;

        BigDecimal dailyInterest = dayCountEngine.calculateDailyAccrual(
                loan.getOutstandingPrincipal(), loan.getInterestRate(), LocalDate.now());

        loan.setAccruedInterest(loan.getAccruedInterest().add(dailyInterest));
        loan.setTotalInterestCharged(loan.getTotalInterestCharged().add(
                dailyInterest.setScale(2, RoundingMode.HALF_UP)));
        loanAccountRepository.save(loan);
        return dailyInterest;
    }

    @Transactional
    public int batchAccrueInterest() {
        List<LoanAccount> activeLoans = loanAccountRepository.findAllActiveLoans();
        int count = 0;
        for (LoanAccount loan : activeLoans) {
            try { accrueInterest(loan.getId()); count++; }
            catch (Exception e) { log.error("Loan interest accrual failed for {}: {}", loan.getLoanNumber(), e.getMessage()); }
        }
        log.info("Loan batch accrual: {} loans processed", count);
        return count;
    }

    // ========================================================================
    // REPAYMENT PROCESSING
    // ========================================================================

    @Transactional
    public ScheduleEntryDto processRepayment(Long loanId, BigDecimal amount) {
        LoanAccount loan = loanAccountRepository.findByIdWithDetails(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", "id", loanId));

        List<LoanRepaymentSchedule> pendingInstallments = scheduleRepository.findPendingInstallments(loanId);
        if (pendingInstallments.isEmpty()) {
            throw new BusinessException("No pending installments", "NO_PENDING_INSTALLMENTS");
        }

        LoanRepaymentSchedule installment = pendingInstallments.get(0);
        BigDecimal remaining = amount;

        // Apply to interest first, then principal
        BigDecimal interestOutstanding = installment.getInterestDue().subtract(installment.getInterestPaid());
        BigDecimal interestPayment = remaining.min(interestOutstanding);
        installment.setInterestPaid(installment.getInterestPaid().add(interestPayment));
        remaining = remaining.subtract(interestPayment);

        BigDecimal principalOutstanding = installment.getPrincipalDue().subtract(installment.getPrincipalPaid());
        BigDecimal principalPayment = remaining.min(principalOutstanding);
        installment.setPrincipalPaid(installment.getPrincipalPaid().add(principalPayment));
        remaining = remaining.subtract(principalPayment);

        installment.setTotalPaid(installment.getPrincipalPaid().add(installment.getInterestPaid()));
        installment.setOutstanding(installment.getTotalDue().subtract(installment.getTotalPaid()));

        if (installment.getOutstanding().compareTo(BigDecimal.ZERO) <= 0) {
            installment.setStatus(ScheduleInstallmentStatus.PAID);
            installment.setPaidDate(LocalDate.now());
        } else {
            installment.setStatus(ScheduleInstallmentStatus.PARTIALLY_PAID);
        }
        scheduleRepository.save(installment);

        // Update loan account
        loan.setOutstandingPrincipal(loan.getOutstandingPrincipal().subtract(principalPayment));
        loan.setTotalInterestPaid(loan.getTotalInterestPaid().add(interestPayment));
        loan.setLastPaymentDate(LocalDate.now());

        if (installment.getStatus() == ScheduleInstallmentStatus.PAID) {
            loan.setPaidInstallments(loan.getPaidInstallments() + 1);
            if (!pendingInstallments.isEmpty() && pendingInstallments.size() > 1) {
                loan.setNextDueDate(pendingInstallments.get(1).getDueDate());
            }
        }

        // Check if loan is fully repaid
        if (loan.getOutstandingPrincipal().compareTo(BigDecimal.ZERO) <= 0) {
            loan.setStatus(LoanAccountStatus.CLOSED);
            loan.setClosedDate(LocalDate.now());
            loan.setOutstandingPrincipal(BigDecimal.ZERO);
        }

        // Reset delinquency on payment
        loan.setDaysPastDue(0);
        loan.updateDelinquency();
        loanAccountRepository.save(loan);

        // Debit repayment account
        if (loan.getRepaymentAccount() != null) {
            Account repaymentAccount = loan.getRepaymentAccount();
            accountPostingService.postDebit(
                    repaymentAccount,
                    TransactionType.DEBIT,
                    amount.subtract(remaining),
                    "Loan repayment " + loan.getLoanNumber(),
                    TransactionChannel.SYSTEM,
                    "LOAN:" + loan.getLoanNumber() + ":REPAY:" + installment.getInstallmentNumber());
        }

        log.info("Loan repayment processed: loan={}, installment={}, principal={}, interest={}, remaining={}",
                loan.getLoanNumber(), installment.getInstallmentNumber(), principalPayment, interestPayment,
                loan.getOutstandingPrincipal());

        return toScheduleEntryDto(installment);
    }

    // ========================================================================
    // LOAN PRODUCTS
    // ========================================================================

    public List<LoanProductDto> getAllLoanProducts() {
        return productRepository.findByIsActiveTrueOrderByNameAsc().stream().map(this::toLoanProductDto).toList();
    }

    public List<LoanProductDto> getIslamicProducts() {
        return productRepository.findByIsIslamicTrueAndIsActiveTrue().stream().map(this::toLoanProductDto).toList();
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    private void validateApplicationAgainstProduct(LoanApplicationRequest request, LoanProduct product) {
        if (request.getRequestedAmount().compareTo(product.getMinLoanAmount()) < 0) {
            throw new BusinessException("Requested amount below product minimum: " +
                    product.getMinLoanAmount(), "BELOW_MIN_AMOUNT");
        }
        if (request.getRequestedAmount().compareTo(product.getMaxLoanAmount()) > 0) {
            throw new BusinessException("Requested amount exceeds product maximum: " +
                    product.getMaxLoanAmount(), "EXCEEDS_MAX_AMOUNT");
        }
        if (request.getRequestedTenureMonths() < product.getMinTenureMonths()) {
            throw new BusinessException("Requested tenure below product minimum: " +
                    product.getMinTenureMonths() + " months", "BELOW_MIN_TENURE");
        }
        if (request.getRequestedTenureMonths() > product.getMaxTenureMonths()) {
            throw new BusinessException("Requested tenure exceeds product maximum: " +
                    product.getMaxTenureMonths() + " months", "EXCEEDS_MAX_TENURE");
        }
    }

    // ========================================================================
    // MAPPERS
    // ========================================================================

    private LoanApplicationResponse toApplicationResponse(LoanApplication a) {
        return LoanApplicationResponse.builder()
                .id(a.getId()).applicationNumber(a.getApplicationNumber())
                .customerId(a.getCustomer().getId()).customerDisplayName(a.getCustomer().getDisplayName())
                .loanProductCode(a.getLoanProduct().getCode()).loanProductName(a.getLoanProduct().getName())
                .loanType(a.getLoanProduct().getLoanType().name())
                .requestedAmount(a.getRequestedAmount()).approvedAmount(a.getApprovedAmount())
                .currencyCode(a.getCurrencyCode())
                .requestedTenureMonths(a.getRequestedTenureMonths()).approvedTenureMonths(a.getApprovedTenureMonths())
                .purpose(a.getPurpose())
                .proposedRate(a.getProposedRate()).approvedRate(a.getApprovedRate())
                .rateType(a.getRateType())
                .repaymentScheduleType(a.getRepaymentScheduleType()).repaymentFrequency(a.getRepaymentFrequency())
                .isIslamic(a.getIsIslamic()).islamicStructure(a.getIslamicStructure())
                .assetCost(a.getAssetCost()).profitRate(a.getProfitRate())
                .creditScore(a.getCreditScore()).riskGrade(a.getRiskGrade())
                .debtToIncomeRatio(a.getDebtToIncomeRatio()).decisionEngineResult(a.getDecisionEngineResult())
                .status(a.getStatus()).submittedAt(a.getSubmittedAt())
                .reviewedBy(a.getReviewedBy()).reviewedAt(a.getReviewedAt())
                .approvedBy(a.getApprovedBy()).approvedAt(a.getApprovedAt())
                .declineReason(a.getDeclineReason()).conditions(a.getConditions())
                .createdAt(a.getCreatedAt()).build();
    }

    private LoanAccountResponse toLoanAccountResponse(LoanAccount l) {
        List<ScheduleEntryDto> schedule = scheduleRepository
                .findByLoanAccountIdOrderByInstallmentNumberAsc(l.getId())
                .stream().map(this::toScheduleEntryDto).toList();

        return LoanAccountResponse.builder()
                .id(l.getId()).loanNumber(l.getLoanNumber())
                .applicationNumber(l.getApplication() != null ? l.getApplication().getApplicationNumber() : null)
                .customerId(l.getCustomer().getId()).customerDisplayName(l.getCustomer().getDisplayName())
                .loanProductCode(l.getLoanProduct().getCode()).loanProductName(l.getLoanProduct().getName())
                .currencyCode(l.getCurrencyCode())
                .sanctionedAmount(l.getSanctionedAmount()).disbursedAmount(l.getDisbursedAmount())
                .outstandingPrincipal(l.getOutstandingPrincipal())
                .interestRate(l.getInterestRate()).rateType(l.getRateType())
                .accruedInterest(l.getAccruedInterest())
                .totalInterestCharged(l.getTotalInterestCharged()).totalInterestPaid(l.getTotalInterestPaid())
                .repaymentScheduleType(l.getRepaymentScheduleType()).repaymentFrequency(l.getRepaymentFrequency())
                .tenureMonths(l.getTenureMonths()).totalInstallments(l.getTotalInstallments())
                .paidInstallments(l.getPaidInstallments()).nextDueDate(l.getNextDueDate()).emiAmount(l.getEmiAmount())
                .isIslamic(l.getIsIslamic()).islamicStructure(l.getIslamicStructure())
                .totalProfit(l.getTotalProfit()).profitPaid(l.getProfitPaid())
                .daysPastDue(l.getDaysPastDue()).delinquencyBucket(l.getDelinquencyBucket())
                .ifrs9Stage(l.getIfrs9Stage()).provisionAmount(l.getProvisionAmount())
                .totalPenalties(l.getTotalPenalties())
                .disbursementDate(l.getDisbursementDate()).firstRepaymentDate(l.getFirstRepaymentDate())
                .maturityDate(l.getMaturityDate()).lastPaymentDate(l.getLastPaymentDate())
                .status(l.getStatus()).schedule(schedule).createdAt(l.getCreatedAt()).build();
    }

    private ScheduleEntryDto toScheduleEntryDto(LoanRepaymentSchedule s) {
        return ScheduleEntryDto.builder()
                .id(s.getId()).installmentNumber(s.getInstallmentNumber()).dueDate(s.getDueDate())
                .principalDue(s.getPrincipalDue()).interestDue(s.getInterestDue()).totalDue(s.getTotalDue())
                .principalPaid(s.getPrincipalPaid()).interestPaid(s.getInterestPaid())
                .penaltyDue(s.getPenaltyDue()).penaltyPaid(s.getPenaltyPaid())
                .totalPaid(s.getTotalPaid()).outstanding(s.getOutstanding())
                .paidDate(s.getPaidDate()).status(s.getStatus()).overdue(s.isOverdue()).build();
    }

    private LoanProductDto toLoanProductDto(LoanProduct p) {
        return LoanProductDto.builder()
                .id(p.getId()).code(p.getCode()).name(p.getName()).description(p.getDescription())
                .loanType(p.getLoanType().name()).targetSegment(p.getTargetSegment())
                .currencyCode(p.getCurrencyCode())
                .minInterestRate(p.getMinInterestRate()).maxInterestRate(p.getMaxInterestRate())
                .defaultInterestRate(p.getDefaultInterestRate()).rateType(p.getRateType())
                .minLoanAmount(p.getMinLoanAmount()).maxLoanAmount(p.getMaxLoanAmount())
                .minTenureMonths(p.getMinTenureMonths()).maxTenureMonths(p.getMaxTenureMonths())
                .requiresCollateral(p.getRequiresCollateral())
                .isIslamic(p.getIsIslamic()).profitSharingRatio(p.getProfitSharingRatio())
                .isActive(p.getIsActive()).build();
    }
}
