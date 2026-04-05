package com.cbs.zakat.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.reports.service.ReportsService;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import com.cbs.zakat.dto.ZakatRequests;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatComputation;
import com.cbs.zakat.entity.ZakatComputationLineItem;
import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.entity.ZakatMethodology;
import com.cbs.zakat.repository.ZakatComputationLineItemRepository;
import com.cbs.zakat.repository.ZakatComputationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.chrono.HijrahDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZakatComputationService {

    private static final String DEFAULT_ZAKAT_PAYABLE_GL = "2200-000-001";

    private final ZakatComputationRepository computationRepository;
    private final ZakatComputationLineItemRepository lineItemRepository;
    private final ZakatMethodologyService methodologyService;
    private final ZakatClassificationService classificationService;
    private final ZakatCalculationEngine calculationEngine;
    private final ReportsService reportsService;
    private final HijriCalendarService hijriCalendarService;
    private final CustomerRepository customerRepository;
    private final WadiahAccountRepository wadiahAccountRepository;
    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final TransactionJournalRepository transactionJournalRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final IslamicPostingRuleService islamicPostingRuleService;
    private final CurrentTenantResolver tenantResolver;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ZakatComputation computeBankZakat(ZakatRequests.ComputeBankZakatRequest request) {
        ZakatMethodology methodology = methodologyService.validateMethodologyApproved(request.getMethodologyCode());
        LocalDate computationDate = hijriCalendarService.getZakatCalculationDate(request.getZakatYear());
        LocalDate periodFrom = hijriCalendarService.getHijriYearStart(request.getZakatYear());
        HijriDateResponse fromHijri = hijriCalendarService.toHijri(periodFrom);
        HijriDateResponse toHijri = hijriCalendarService.toHijri(computationDate);

        List<ZakatResponses.ZakatClassificationResult> classifiedAccounts =
                classificationService.classifyAllAccounts(methodology.getClassificationRuleSetCode(), computationDate);
        classifiedAccounts = applyMethodologyOverrides(classifiedAccounts, methodology);

        BigDecimal totalAssetsFromGl = reportsService.getBalanceSheet(computationDate).getTotalAssets();
        ZakatResponses.ZakatCalculationResult calculation = calculationEngine.calculate(
                classifiedAccounts,
                ZakatCalculationEngine.CalculationParameters.builder()
                        .rateBasis(methodology.getZakatRateBasis())
                        .checkNisab(false)
                        .expectedTotalAssets(totalAssetsFromGl)
                        .targetCurrency("SAR")
                        .build());

        ZakatComputation computation = computationRepository
                .findByComputationTypeAndZakatYear(ZakatDomainEnums.ComputationType.BANK_ZAKAT, request.getZakatYear())
                .orElseGet(ZakatComputation::new);

        populateBaseComputation(computation, methodology, ZakatDomainEnums.ComputationType.BANK_ZAKAT,
                request.getZakatYear(), computationDate, periodFrom, ZakatSupport.hijriLabel(fromHijri),
                ZakatSupport.hijriLabel(toHijri));
        applyCalculation(computation, calculation, methodology, "SAR");
        computation.setStatus(ZakatDomainEnums.ZakatStatus.CALCULATED);
        computation = computationRepository.save(computation);
        persistLineItems(computation.getId(), classifiedAccounts);
        return computation;
    }

    @Transactional(readOnly = true)
    public ZakatResponses.ZakatCalculationResult calculate(ZakatRequests.CalculateZakatRequest request) {
        return calculationEngine.calculate(
                request.getClassifiedAccounts(),
                ZakatCalculationEngine.CalculationParameters.builder()
                        .rateBasis(request.getRateBasis())
                        .checkNisab(request.getCheckNisab())
                        .nisabThreshold(request.getNisabThreshold())
                        .adjustments(request.getAdjustments())
                        .expectedTotalAssets(request.getExpectedTotalAssets())
                        .targetCurrency(request.getTargetCurrency())
                        .build());
    }

    @Transactional
    public ZakatResponses.CustomerZakatResult computeCustomerZakat(Long customerId, Integer zakatYear, String methodologyCode) {
        Customer customer = customerRepository.findByIdWithDetails(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        ZakatMethodology methodology = StringUtils.hasText(methodologyCode)
                ? methodologyService.validateMethodologyApproved(methodologyCode)
                : methodologyService.getActiveMethodology();

        LocalDate dueDate = hijriCalendarService.getZakatCalculationDate(zakatYear);
        LocalDate haulStart = LocalDate.from(HijrahDate.from(dueDate).minus(1, ChronoUnit.YEARS));
        BigDecimal nisabThreshold = calculationEngine.calculateNisab(dueDate, "SAR", methodology.getNisabBasis());

        List<ZakatResponses.CustomerAccountZakatBreakdown> breakdown = new ArrayList<>();
        List<ZakatResponses.ZakatClassificationResult> syntheticClassification = new ArrayList<>();

        appendWadiahAccounts(customerId, dueDate, haulStart, methodology, breakdown, syntheticClassification);
        appendMudarabahAccounts(customerId, dueDate, haulStart, methodology, breakdown, syntheticClassification);

        BigDecimal expectedTotalAssets = syntheticClassification.stream()
                .map(item -> calculationEngine.convertCurrency(item.getAdjustedAmount(), item.getCurrencyCode(), "SAR"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        ZakatResponses.ZakatCalculationResult calculation = calculationEngine.calculate(
                syntheticClassification,
                ZakatCalculationEngine.CalculationParameters.builder()
                        .rateBasis(methodology.getZakatRateBasis())
                        .checkNisab(true)
                        .nisabThreshold(nisabThreshold)
                        .expectedTotalAssets(expectedTotalAssets)
                        .targetCurrency("SAR")
                        .build());

        for (ZakatResponses.CustomerAccountZakatBreakdown item : breakdown) {
            BigDecimal zakatAmount = calculation.isBelowNisab() || !item.isHaulMet()
                    ? BigDecimal.ZERO
                    : calculationEngine.convertCurrency(item.getZakatableBalance(), item.getCurrencyCode(), "SAR")
                    .multiply(calculationEngine.resolveRate(methodology.getZakatRateBasis()))
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            item.setZakatAmount(ZakatSupport.money(zakatAmount));
        }

        boolean deductionEligible = customer.isIndividual() && ZakatSupport.isSaudiNational(customer.getNationality());
        boolean deductionAllowed = switch (methodology.getCustomerZakatDeductionPolicy()) {
            case MANDATORY_SAUDI_NATIONALS, OPT_IN, BANK_DISCRETION -> deductionEligible;
            case NOT_APPLICABLE -> false;
        };

        ZakatComputation computation = computationRepository
                .findByComputationTypeAndCustomerIdAndZakatYear(
                        ZakatDomainEnums.ComputationType.CUSTOMER_ZAKAT_INDIVIDUAL,
                        customerId,
                        zakatYear)
                .orElseGet(ZakatComputation::new);
        populateBaseComputation(computation, methodology, ZakatDomainEnums.ComputationType.CUSTOMER_ZAKAT_INDIVIDUAL,
                zakatYear, dueDate, haulStart, ZakatSupport.hijriLabel(hijriCalendarService.toHijri(haulStart)),
                ZakatSupport.hijriLabel(hijriCalendarService.toHijri(dueDate)));
        computation.setCustomerId(customer.getId());
        computation.setCustomerName(customer.getDisplayName());
        applyCalculation(computation, calculation, methodology, "SAR");
        computation.setStatus(calculation.isBelowNisab()
                ? ZakatDomainEnums.ZakatStatus.CLOSED
                : ZakatDomainEnums.ZakatStatus.CALCULATED);
        computation = computationRepository.save(computation);
        persistCustomerLineItems(computation.getId(), breakdown, syntheticClassification);

        String notes = calculation.isBelowNisab()
                ? "Customer balances are below Nisab threshold"
                : deductionAllowed
                ? "Eligible for customer-side Zakat deduction"
                : "Customer-side Zakat deduction not allowed by methodology or nationality";

        return ZakatResponses.CustomerZakatResult.builder()
                .customerId(customer.getId())
                .customerName(customer.getDisplayName())
                .zakatYear(zakatYear)
                .methodologyCode(methodology.getMethodologyCode())
                .totalZakatableBalance(ZakatSupport.money(calculation.getZakatBase()))
                .nisabThreshold(ZakatSupport.money(nisabThreshold))
                .belowNisab(calculation.isBelowNisab())
                .totalZakat(ZakatSupport.money(calculation.getAdjustedZakatAmount()))
                .deductionEligible(deductionEligible)
                .deductionAllowed(deductionAllowed)
                .rateBasis(methodology.getZakatRateBasis().name())
                .accountBreakdown(breakdown.stream()
                        .sorted(Comparator.comparing(ZakatResponses.CustomerAccountZakatBreakdown::getAccountNumber,
                                Comparator.nullsLast(String::compareTo)))
                        .toList())
                .notes(notes)
                .build();
    }

    @Transactional
    public List<ZakatResponses.CustomerZakatResult> computeCustomerAggregate(ZakatRequests.ComputeCustomerAggregateRequest request) {
        ZakatMethodology methodology = methodologyService.getActiveMethodology();
        return customerRepository.findAll().stream()
                .filter(Customer::isIndividual)
                .filter(customer -> ZakatSupport.isSaudiNational(customer.getNationality()))
                .map(customer -> computeCustomerZakat(customer.getId(), request.getZakatYear(), methodology.getMethodologyCode()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ZakatComputation getComputation(String computationRef) {
        return computationRepository.findByComputationRef(computationRef)
                .orElseThrow(() -> new ResourceNotFoundException("ZakatComputation", "computationRef", computationRef));
    }

    @Transactional(readOnly = true)
    public List<ZakatComputationLineItem> getComputationLineItems(String computationRef) {
        ZakatComputation computation = getComputation(computationRef);
        return lineItemRepository.findByComputationIdOrderByLineNumberAsc(computation.getId());
    }

    @Transactional
    public ZakatComputation reviewComputation(String computationRef, ZakatRequests.SsbReviewRequest request) {
        ZakatComputation computation = getComputation(computationRef);
        computation.setSsbReviewedBy(request.getReviewedBy());
        computation.setSsbReviewedAt(LocalDateTime.now());
        computation.setSsbComments(request.getComments());
        computation.setStatus(request.isApproved()
                ? ZakatDomainEnums.ZakatStatus.SSB_REVIEWED
                : ZakatDomainEnums.ZakatStatus.DRAFT);
        return computationRepository.save(computation);
    }

    @Transactional
    public ZakatComputation approveComputation(String computationRef, ZakatRequests.ApproveComputationRequest request) {
        ZakatComputation computation = getComputation(computationRef);
        methodologyService.validateMethodologyApproved(computation.getMethodologyCode());
        if (computation.getStatus() != ZakatDomainEnums.ZakatStatus.CALCULATED
                && computation.getStatus() != ZakatDomainEnums.ZakatStatus.SSB_REVIEWED) {
            throw new BusinessException("Only calculated or SSB-reviewed computations can be approved",
                    "INVALID_ZAKAT_COMPUTATION_STATE");
        }
        computation.setApprovedBy(request.getApprovedBy());
        computation.setApprovedAt(LocalDateTime.now());
        computation.setStatus(ZakatDomainEnums.ZakatStatus.APPROVED);
        return computationRepository.save(computation);
    }

    @Transactional
    public ZakatComputation accrueZakat(String computationRef, ZakatRequests.AccrueZakatRequest request) {
        ZakatComputation computation = getComputation(computationRef);
        if (computation.getComputationType() != ZakatDomainEnums.ComputationType.BANK_ZAKAT) {
            throw new BusinessException("Zakat accrual is only supported for bank computations",
                    "INVALID_ZAKAT_ACCRUAL_TYPE");
        }
        if (computation.getStatus() != ZakatDomainEnums.ZakatStatus.APPROVED) {
            throw new BusinessException("Computation must be approved before accrual",
                    "ZAKAT_COMPUTATION_NOT_APPROVED");
        }
        if (computation.getAdjustedZakatAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("No Zakat amount is due for accrual", "ZAKAT_AMOUNT_NOT_DUE");
        }

        islamicPostingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("ALL")
                .txnType(IslamicTransactionType.ZAKAT_PROVISION)
                .amount(computation.getAdjustedZakatAmount())
                .valueDate(request.getAsOfDate())
                .reference(computation.getComputationRef())
                .narration("Bank Zakat accrual for Hijri year " + computation.getZakatYear())
                .build());

        computation.setCalculatedAt(LocalDateTime.now());
        return computationRepository.save(computation);
    }

    @Transactional
    public ZakatComputation payComputation(String computationRef, ZakatRequests.PayZakatRequest request) {
        ZakatComputation computation = getComputation(computationRef);
        if (request.getPaymentAmount().compareTo(computation.getAdjustedZakatAmount()) > 0) {
            throw new BusinessException("Payment amount exceeds outstanding Zakat amount",
                    "ZAKAT_PAYMENT_EXCEEDS_OUTSTANDING");
        }
        computation.setStatus(request.getPaymentAmount().compareTo(computation.getAdjustedZakatAmount()) >= 0
                ? ZakatDomainEnums.ZakatStatus.PAID
                : ZakatDomainEnums.ZakatStatus.ZATCA_ASSESSED);
        return computationRepository.save(computation);
    }

    @Transactional
    public ZakatResponses.ZakatCertificate deductCustomerZakat(Long customerId, ZakatRequests.CustomerZakatDeductionRequest request) {
        ZakatComputation computation = computationRepository.findByComputationTypeAndCustomerIdAndZakatYear(
                        ZakatDomainEnums.ComputationType.CUSTOMER_ZAKAT_INDIVIDUAL,
                        customerId,
                        request.getZakatYear())
                .orElseThrow(() -> new ResourceNotFoundException("ZakatComputation", "customerId", customerId));
        methodologyService.validateMethodologyApproved(computation.getMethodologyCode());
        if (request.getZakatAmount().compareTo(computation.getAdjustedZakatAmount()) > 0) {
            throw new BusinessException("Requested deduction exceeds computed customer Zakat",
                    "CUSTOMER_ZAKAT_DEDUCTION_EXCEEDS_COMPUTED");
        }

        Account sourceAccount = resolveSourceAccount(customerId, request.getSourceAccountNumber(), request.getZakatAmount());
        accountPostingService.postDebitAgainstGl(
                sourceAccount,
                TransactionType.DEBIT,
                request.getZakatAmount(),
                "Customer Zakat deduction for Hijri year " + request.getZakatYear(),
                TransactionChannel.SYSTEM,
                computation.getComputationRef(),
                DEFAULT_ZAKAT_PAYABLE_GL,
                "ZAKAT",
                computation.getComputationRef());

        if (request.getZakatAmount().compareTo(computation.getAdjustedZakatAmount()) >= 0) {
            computation.setStatus(ZakatDomainEnums.ZakatStatus.PAID);
            computationRepository.save(computation);
        }
        return generateCustomerCertificate(customerId, request.getZakatYear());
    }

    @Transactional(readOnly = true)
    public ZakatResponses.ZakatCertificate generateCustomerCertificate(Long customerId, Integer zakatYear) {
        ZakatComputation computation = computationRepository.findByComputationTypeAndCustomerIdAndZakatYear(
                        ZakatDomainEnums.ComputationType.CUSTOMER_ZAKAT_INDIVIDUAL,
                        customerId,
                        zakatYear)
                .orElseThrow(() -> new ResourceNotFoundException("ZakatComputation", "customerId", customerId));
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        ZakatMethodology methodology = methodologyService.getMethodology(computation.getMethodologyCode());
        return ZakatResponses.ZakatCertificate.builder()
                .certificateRef("ZKT-CERT-" + customerId + "-" + zakatYear)
                .customerId(customerId)
                .customerName(customer.getDisplayName())
                .zakatYear(zakatYear)
                .computationDate(computation.getComputationDate())
                .methodologyCode(computation.getMethodologyCode())
                .fatwaRef(methodology.getFatwaRef())
                .paymentStatus(computation.getStatus().name())
                .zatcaReference(computation.getZatcaAssessmentRef())
                .englishText("This certifies that Zakat for Hijri year " + zakatYear + " was computed under methodology "
                        + computation.getMethodologyCode() + " for " + customer.getDisplayName() + ".")
                .arabicText("تشهد هذه الشهادة بأنه تم احتساب الزكاة للسنة الهجرية " + zakatYear
                        + " وفق المنهجية " + computation.getMethodologyCode() + " للعميل " + customer.getDisplayName() + ".")
                .build();
    }

    @Transactional(readOnly = true)
    public ZakatResponses.ZakatTrendReport getTrendReport(Integer fromYear, Integer toYear) {
        List<ZakatComputation> computations = computationRepository
                .findByComputationTypeAndZakatYearBetweenOrderByZakatYearAsc(
                        ZakatDomainEnums.ComputationType.BANK_ZAKAT,
                        fromYear,
                        toYear);
        return ZakatResponses.ZakatTrendReport.builder()
                .fromYear(fromYear)
                .toYear(toYear)
                .items(computations.stream()
                        .map(computation -> ZakatResponses.ZakatTrendItem.builder()
                                .zakatYear(computation.getZakatYear())
                                .zakatBase(computation.getZakatBase())
                                .zakatAmount(computation.getZakatAmount())
                                .adjustedZakatAmount(computation.getAdjustedZakatAmount())
                                .effectiveRate(effectiveRate(computation))
                                .status(computation.getStatus().name())
                                .build())
                        .toList())
                .build();
    }

    @Transactional(readOnly = true)
    public ZakatResponses.ClassificationSummary summarizeClassifications(String methodologyCode, LocalDate asOfDate) {
        return ZakatResponses.ClassificationSummary.builder()
                .items(classificationService.classifyAllAccounts(methodologyCode, asOfDate))
                .unclassifiedAccounts(classificationService.findUnclassifiedAccounts(methodologyCode))
                .build();
    }

    private void appendWadiahAccounts(Long customerId,
                                      LocalDate dueDate,
                                      LocalDate haulStart,
                                      ZakatMethodology methodology,
                                      List<ZakatResponses.CustomerAccountZakatBreakdown> breakdown,
                                      List<ZakatResponses.ZakatClassificationResult> syntheticClassification) {
        for (WadiahAccount wadiah : wadiahAccountRepository.findByCustomerId(customerId)) {
            if (wadiah.getAccount() == null || !Boolean.TRUE.equals(wadiah.getZakatApplicable())) {
                continue;
            }
            appendAccountBreakdown(wadiah.getAccount(), wadiah.getContractSignedDate(), dueDate, haulStart,
                    methodology, "WADIAH", breakdown, syntheticClassification);
        }
    }

    private void appendMudarabahAccounts(Long customerId,
                                         LocalDate dueDate,
                                         LocalDate haulStart,
                                         ZakatMethodology methodology,
                                         List<ZakatResponses.CustomerAccountZakatBreakdown> breakdown,
                                         List<ZakatResponses.ZakatClassificationResult> syntheticClassification) {
        for (MudarabahAccount mudarabah : mudarabahAccountRepository.findByCustomerId(customerId)) {
            if (mudarabah.getAccount() == null || !mudarabah.isZakatApplicable()) {
                continue;
            }
            appendAccountBreakdown(mudarabah.getAccount(), mudarabah.getContractSignedDate(), dueDate, haulStart,
                    methodology, "MUDARABAH", breakdown, syntheticClassification);
        }
    }

    private void appendAccountBreakdown(Account account,
                                        LocalDate contractSignedDate,
                                        LocalDate dueDate,
                                        LocalDate haulStart,
                                        ZakatMethodology methodology,
                                        String contractType,
                                        List<ZakatResponses.CustomerAccountZakatBreakdown> breakdown,
                                        List<ZakatResponses.ZakatClassificationResult> syntheticClassification) {
        if (account.getStatus() == AccountStatus.CLOSED || account.getStatus() == AccountStatus.ESCHEAT) {
            return;
        }
        LocalDate heldSince = contractSignedDate != null ? contractSignedDate : account.getOpenedDate();
        boolean haulMet = hijriCalendarService.hasCompletedHijriYear(heldSince, dueDate);
        BigDecimal sourceBalance = resolveBalance(account.getId(), methodology.getBalanceMethod(), haulStart, dueDate,
                account.getBookBalance());
        if (sourceBalance.compareTo(BigDecimal.ZERO) < 0) {
            sourceBalance = BigDecimal.ZERO;
        }
        syntheticClassification.add(ZakatResponses.ZakatClassificationResult.builder()
                .glAccountCode(account.getAccountNumber())
                .glAccountName(account.getAccountName())
                .currencyCode(account.getCurrencyCode())
                .glBalance(sourceBalance)
                .zakatClassification(haulMet
                        ? ZakatDomainEnums.ZakatClassification.ZAKATABLE_ASSET.name()
                        : ZakatDomainEnums.ZakatClassification.NON_ZAKATABLE_ASSET.name())
                .subCategory(contractType)
                .valuationMethod(ZakatDomainEnums.ValuationMethod.BOOK_VALUE.name())
                .adjustedAmount(sourceBalance)
                .includedInZakatBase(haulMet)
                .exclusionReason(haulMet ? null : "Haul not completed")
                .classificationRuleCode("CUSTOMER-" + contractType)
                .build());
        breakdown.add(ZakatResponses.CustomerAccountZakatBreakdown.builder()
                .accountId(account.getId())
                .accountNumber(account.getAccountNumber())
                .contractType(contractType)
                .balanceMethodUsed(methodology.getBalanceMethod().name())
                .openedDate(heldSince)
                .zakatDueDate(dueDate)
                .haulMet(haulMet)
                .currencyCode(account.getCurrencyCode())
                .sourceBalance(ZakatSupport.money(sourceBalance))
                .zakatableBalance(haulMet ? ZakatSupport.money(sourceBalance) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .notes(haulMet ? null : "Held for less than one Hijri year")
                .build());
    }

    private BigDecimal resolveBalance(Long accountId,
                                      ZakatDomainEnums.BalanceMethod balanceMethod,
                                      LocalDate fromDate,
                                      LocalDate toDate,
                                      BigDecimal fallbackBalance) {
        return switch (balanceMethod) {
            case MINIMUM_BALANCE -> ZakatSupport.money(transactionJournalRepository
                    .findMinimumBalanceInPeriod(accountId, fromDate, toDate));
            case AVERAGE_BALANCE -> ZakatSupport.money(transactionJournalRepository
                    .findAverageBalanceInPeriod(accountId, fromDate, toDate));
            case HIGHEST_BALANCE -> ZakatSupport.money(transactionJournalRepository
                    .findMaximumBalanceInPeriod(accountId, fromDate, toDate));
            case END_OF_YEAR -> transactionJournalRepository
                    .findTopByAccountIdAndStatusAndPostingDateLessThanEqualOrderByPostingDateDescCreatedAtDesc(
                            accountId, "POSTED", toDate)
                    .map(journal -> ZakatSupport.money(journal.getRunningBalance()))
                    .orElse(ZakatSupport.money(fallbackBalance));
        };
    }

    private void populateBaseComputation(ZakatComputation computation,
                                         ZakatMethodology methodology,
                                         ZakatDomainEnums.ComputationType type,
                                         Integer zakatYear,
                                         LocalDate computationDate,
                                         LocalDate periodFrom,
                                         String periodFromHijri,
                                         String periodToHijri) {
        if (!StringUtils.hasText(computation.getComputationRef())) {
            computation.setComputationRef(ZakatSupport.buildReference("ZKT"));
        }
        computation.setComputationType(type);
        computation.setZakatYear(zakatYear);
        computation.setZakatYearGregorian(computationDate.getYear());
        computation.setPeriodFrom(periodFrom);
        computation.setPeriodTo(computationDate);
        computation.setPeriodFromHijri(periodFromHijri);
        computation.setPeriodToHijri(periodToHijri);
        computation.setComputationDate(computationDate);
        computation.setMethodologyCode(methodology.getMethodologyCode());
        computation.setMethodologyDescription(methodology.getDescription());
        computation.setMethodologyApprovalId(methodology.getFatwaId());
        computation.setMethodologyApprovedBySsb(methodology.isSsbApproved());
        computation.setZakatRateBasis(methodology.getZakatRateBasis());
        computation.setCalculatedBy(currentActorProvider.getCurrentActor());
        computation.setCalculatedAt(LocalDateTime.now());
        computation.setTenantId(tenantResolver.getCurrentTenantId());
    }

    private void applyCalculation(ZakatComputation computation,
                                  ZakatResponses.ZakatCalculationResult calculation,
                                  ZakatMethodology methodology,
                                  String currencyCode) {
        computation.setZakatableAssets(ZakatSupport.money(calculation.getZakatableAssets()));
        computation.setNonZakatableAssets(ZakatSupport.money(calculation.getNonZakatableAssets()));
        computation.setTotalAssets(ZakatSupport.money(calculation.getTotalAssetsFromClassification()));
        computation.setDeductibleLiabilities(ZakatSupport.money(calculation.getDeductibleLiabilities()));
        computation.setZakatBase(ZakatSupport.money(calculation.getZakatBase()));
        computation.setAssetBreakdown(new LinkedHashMap<>(calculation.getAssetBreakdown()));
        computation.setLiabilityBreakdown(new LinkedHashMap<>(calculation.getLiabilityBreakdown()));
        computation.setExcludedAssetBreakdown(new LinkedHashMap<>(calculation.getExcludedAssetBreakdown()));
        computation.setZakatRate(ZakatSupport.rate(calculation.getZakatRate()));
        computation.setZakatRateBasis(methodology.getZakatRateBasis());
        computation.setZakatAmount(ZakatSupport.money(calculation.getZakatAmount()));
        computation.setCurrencyCode(currencyCode);
        computation.setAdjustments(new ArrayList<>(calculation.getAppliedAdjustments()));
        computation.setTotalAdjustments(ZakatSupport.money(calculation.getTotalAdjustments()));
        computation.setAdjustedZakatAmount(ZakatSupport.money(calculation.getAdjustedZakatAmount()));
    }

    private void persistLineItems(UUID computationId, List<ZakatResponses.ZakatClassificationResult> items) {
        lineItemRepository.deleteByComputationId(computationId);
        List<ZakatComputationLineItem> entities = new ArrayList<>();
        int index = 1;
        for (ZakatResponses.ZakatClassificationResult item : items) {
            entities.add(ZakatComputationLineItem.builder()
                    .computationId(computationId)
                    .lineNumber(String.format(Locale.ROOT, "%03d", index++))
                    .category(resolveLineCategory(item.getZakatClassification()))
                    .subCategory(item.getSubCategory())
                    .description(item.getGlAccountName())
                    .glAccountCode(item.getGlAccountCode())
                    .amount(ZakatSupport.money(item.getAdjustedAmount()))
                    .includedInBase(item.isIncludedInZakatBase())
                    .exclusionReason(item.getExclusionReason())
                    .classificationRule(item.getClassificationRuleCode())
                    .build());
        }
        lineItemRepository.saveAll(entities);
    }

        private List<ZakatResponses.ZakatClassificationResult> applyMethodologyOverrides(
                        List<ZakatResponses.ZakatClassificationResult> classifiedAccounts,
                        ZakatMethodology methodology) {
                return classifiedAccounts.stream()
                                .map(item -> overrideClassification(item, methodology))
                                .toList();
        }

        private ZakatResponses.ZakatClassificationResult overrideClassification(ZakatResponses.ZakatClassificationResult item,
                                                                                                                                                        ZakatMethodology methodology) {
                if (item == null || !StringUtils.hasText(item.getGlAccountCode())) {
                        return item;
                }
                String glCode = item.getGlAccountCode().toUpperCase(Locale.ROOT);
                if (("2100-WAD-001".equals(glCode) || "3100-MDR-001".equals(glCode))
                                && methodology.getIahTreatment() != ZakatDomainEnums.IahTreatment.DEDUCTIBLE) {
                    ZakatDomainEnums.ZakatClassification classification = methodology.getIahTreatment() == ZakatDomainEnums.IahTreatment.PARTIAL
                            ? ZakatDomainEnums.ZakatClassification.DEDUCTIBLE_LIABILITY
                            : ZakatDomainEnums.ZakatClassification.NON_DEDUCTIBLE_LIABILITY;
                        return ZakatResponses.ZakatClassificationResult.builder()
                                        .glAccountCode(item.getGlAccountCode())
                                        .glAccountName(item.getGlAccountName())
                                        .currencyCode(item.getCurrencyCode())
                                        .glBalance(item.getGlBalance())
                            .zakatClassification(classification.name())
                                        .subCategory(item.getSubCategory())
                                        .valuationMethod(item.getValuationMethod())
                                        .adjustedAmount(adjustPartialDeduction(item.getAdjustedAmount(), methodology.getIahTreatment()))
                                        .provisionDeducted(item.getProvisionDeducted())
                                        .deferredProfitDeducted(item.getDeferredProfitDeducted())
                                        .includedInZakatBase(methodology.getIahTreatment() == ZakatDomainEnums.IahTreatment.PARTIAL)
                                        .classificationRuleCode(item.getClassificationRuleCode())
                                        .exclusionReason("IAH treatment overridden by approved methodology")
                                        .debated(item.isDebated())
                                        .build();
                }
                if (("3200-000-001".equals(glCode) || "3300-000-001".equals(glCode))
                                && methodology.getPerIrrTreatment() == ZakatDomainEnums.PerIrrTreatment.NON_DEDUCTIBLE) {
                        return ZakatResponses.ZakatClassificationResult.builder()
                                        .glAccountCode(item.getGlAccountCode())
                                        .glAccountName(item.getGlAccountName())
                                        .currencyCode(item.getCurrencyCode())
                                        .glBalance(item.getGlBalance())
                                        .zakatClassification(ZakatDomainEnums.ZakatClassification.NON_DEDUCTIBLE_LIABILITY.name())
                                        .subCategory(item.getSubCategory())
                                        .valuationMethod(item.getValuationMethod())
                                        .adjustedAmount(item.getAdjustedAmount())
                                        .provisionDeducted(item.getProvisionDeducted())
                                        .deferredProfitDeducted(item.getDeferredProfitDeducted())
                                        .includedInZakatBase(false)
                                        .classificationRuleCode(item.getClassificationRuleCode())
                                        .exclusionReason("PER/IRR treatment overridden by approved methodology")
                                        .debated(item.isDebated())
                                        .build();
                }
                return item;
        }

        private BigDecimal adjustPartialDeduction(BigDecimal amount, ZakatDomainEnums.IahTreatment treatment) {
                if (treatment == ZakatDomainEnums.IahTreatment.PARTIAL) {
                        return ZakatSupport.money(amount).multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
                }
                return ZakatSupport.money(amount);
        }

    private void persistCustomerLineItems(UUID computationId,
                                          List<ZakatResponses.CustomerAccountZakatBreakdown> breakdown,
                                          List<ZakatResponses.ZakatClassificationResult> syntheticClassification) {
        Map<String, ZakatResponses.ZakatClassificationResult> classificationByAccount = syntheticClassification.stream()
                .collect(LinkedHashMap::new,
                        (map, item) -> map.put(item.getGlAccountCode(), item),
                        Map::putAll);
        lineItemRepository.deleteByComputationId(computationId);
        List<ZakatComputationLineItem> entities = new ArrayList<>();
        int index = 1;
        for (ZakatResponses.CustomerAccountZakatBreakdown item : breakdown) {
            ZakatResponses.ZakatClassificationResult classification = classificationByAccount.get(item.getAccountNumber());
            entities.add(ZakatComputationLineItem.builder()
                    .computationId(computationId)
                    .lineNumber(String.format(Locale.ROOT, "%03d", index++))
                    .category(classification != null
                            ? resolveLineCategory(classification.getZakatClassification())
                            : ZakatDomainEnums.ZakatClassification.NON_ZAKATABLE_ASSET)
                    .subCategory(item.getContractType())
                    .description(item.getAccountNumber())
                    .glAccountCode(item.getAccountNumber())
                    .amount(item.getZakatableBalance())
                    .includedInBase(item.isHaulMet())
                    .exclusionReason(item.getNotes())
                    .classificationRule(classification != null ? classification.getClassificationRuleCode() : null)
                    .build());
        }
        lineItemRepository.saveAll(entities);
    }

    private ZakatDomainEnums.ZakatClassification resolveLineCategory(String classification) {
        if (!StringUtils.hasText(classification) || "UNCLASSIFIED".equalsIgnoreCase(classification)) {
            return ZakatDomainEnums.ZakatClassification.NON_ZAKATABLE_ASSET;
        }
        return ZakatDomainEnums.ZakatClassification.valueOf(classification);
    }

    private Account resolveSourceAccount(Long customerId, String accountNumber, BigDecimal amount) {
        if (StringUtils.hasText(accountNumber)) {
            Account account = accountRepository.findByAccountNumberWithDetails(accountNumber)
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
            if (!customerId.equals(account.getCustomer().getId())) {
                throw new BusinessException("Source account does not belong to customer",
                        "INVALID_ZAKAT_SOURCE_ACCOUNT");
            }
            return account;
        }

        return accountRepository.findByCustomerIdAndStatus(customerId, AccountStatus.ACTIVE).stream()
                .filter(account -> account.getAvailableBalance().compareTo(amount) >= 0)
                .max(Comparator.comparing(Account::getAvailableBalance))
                .orElseThrow(() -> new BusinessException("No active customer account has sufficient balance for Zakat deduction",
                        "CUSTOMER_ZAKAT_SOURCE_ACCOUNT_NOT_FOUND"));
    }

    private BigDecimal effectiveRate(ZakatComputation computation) {
        if (computation.getZakatBase() == null || computation.getZakatBase().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP);
        }
        return computation.getAdjustedZakatAmount()
                .multiply(new BigDecimal("100"))
                .divide(computation.getZakatBase(), 6, RoundingMode.HALF_UP);
    }
}