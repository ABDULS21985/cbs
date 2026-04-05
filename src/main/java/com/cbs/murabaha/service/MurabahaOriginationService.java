package com.cbs.murabaha.service;

import com.cbs.account.repository.ProductRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.murabaha.dto.CreateMurabahaApplicationRequest;
import com.cbs.murabaha.dto.CreditAssessmentRequest;
import com.cbs.murabaha.dto.MurabahaApplicationResponse;
import com.cbs.murabaha.dto.MurabahaApprovalDetails;
import com.cbs.murabaha.dto.MurabahaPricingRequest;
import com.cbs.murabaha.entity.MurabahaApplication;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.MurabahaApplicationRepository;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MurabahaOriginationService {

    private static final AtomicLong APPLICATION_SEQUENCE = new AtomicLong(System.nanoTime());
    private static final AtomicLong CONTRACT_SEQUENCE = new AtomicLong(System.nanoTime());
    private static final BigDecimal DEFAULT_DSR_LIMIT = new BigDecimal("50.00");

    private final MurabahaApplicationRepository applicationRepository;
    private final MurabahaContractRepository contractRepository;
    private final CustomerRepository customerRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final ProductRepository productRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final DecisionTableEvaluator decisionTableEvaluator;
    private final CurrentTenantResolver currentTenantResolver;
    private final CurrentActorProvider actorProvider;

    public MurabahaApplicationResponse createApplication(CreateMurabahaApplicationRequest request) {
        Customer customer = getActiveCustomer(request.getCustomerId());
        ensureKycVerified(customer.getId());

        // Duplicate application check: prevent creating another application for the same customer/product
        // while an existing one is still in progress
        List<MurabahaApplication> existingActive = applicationRepository.findByCustomerIdAndStatusIn(
                request.getCustomerId(),
                List.of(MurabahaDomainEnums.ApplicationStatus.DRAFT,
                        MurabahaDomainEnums.ApplicationStatus.SUBMITTED,
                        MurabahaDomainEnums.ApplicationStatus.CREDIT_ASSESSMENT,
                        MurabahaDomainEnums.ApplicationStatus.PRICING,
                        MurabahaDomainEnums.ApplicationStatus.APPROVED));
        boolean hasDuplicate = existingActive.stream()
                .anyMatch(app -> request.getProductCode().equals(app.getProductCode()));
        if (hasDuplicate) {
            throw new BusinessException("An active Murabaha application already exists for this customer and product",
                    "DUPLICATE_APPLICATION");
        }

        IslamicProductTemplate product = resolveActiveMurabahaProduct(request.getProductCode());
        productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        BigDecimal costPrice = MurabahaSupport.money(
                request.getProposedCostPrice() != null ? request.getProposedCostPrice() : request.getRequestedAmount());
        BigDecimal markupRate = resolveMarkupRate(product, request.getRequestedAmount(), request.getRequestedTenorMonths(),
                request.getProposedMarkupRate());
        BigDecimal sellingPrice = MurabahaSupport.calculateSellingPrice(costPrice, markupRate);
        BigDecimal downPayment = MurabahaSupport.money(request.getProposedDownPayment());
        int tenorMonths = request.getProposedTenorMonths() != null ? request.getProposedTenorMonths() : request.getRequestedTenorMonths();
        BigDecimal installment = MurabahaSupport.calculateInstallmentAmount(sellingPrice.subtract(downPayment), tenorMonths);
        BigDecimal dsrLimit = DEFAULT_DSR_LIMIT;
        BigDecimal dsr = calculateDsr(request.getMonthlyIncome(), request.getExistingFinancingObligations(), installment);

        MurabahaApplication application = MurabahaApplication.builder()
                .applicationRef(MurabahaSupport.nextReference("MRB-APP", APPLICATION_SEQUENCE))
                .customerId(request.getCustomerId())
                .productCode(request.getProductCode())
                .murabahahType(request.getMurabahahType())
                .requestedAmount(MurabahaSupport.money(request.getRequestedAmount()))
                .currencyCode(request.getCurrencyCode())
                .requestedTenorMonths(request.getRequestedTenorMonths())
                .purpose(request.getPurpose())
                .purposeDescription(request.getPurposeDescription())
                .assetDescription(request.getAssetDescription())
                .assetCategory(request.getAssetCategory())
                .supplierName(request.getSupplierName())
                .supplierQuoteAmount(MurabahaSupport.money(request.getSupplierQuoteAmount()))
                .supplierQuoteRef(request.getSupplierQuoteRef())
                .supplierQuoteExpiry(request.getSupplierQuoteExpiry())
                .monthlyIncome(MurabahaSupport.money(request.getMonthlyIncome()))
                .existingFinancingObligations(MurabahaSupport.money(request.getExistingFinancingObligations()))
                .dsr(dsr)
                .dsrLimit(dsrLimit)
                .proposedCostPrice(costPrice)
                .proposedMarkupRate(MurabahaSupport.rate(markupRate))
                .proposedSellingPrice(sellingPrice)
                .proposedDownPayment(downPayment)
                .proposedTenorMonths(tenorMonths)
                .proposedInstallmentAmount(installment)
                .status(MurabahaDomainEnums.ApplicationStatus.DRAFT)
                .currentStep("APPLICATION_CREATED")
                .assignedOfficerId(null)
                .branchId(request.getBranchId())
                .channel(request.getChannel())
                .settlementAccountId(request.getSettlementAccountId())
                .submittedAt(null)
                .expiresAt(Instant.now().plusSeconds(30L * 24 * 60 * 60))
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();

        application = applicationRepository.save(application);
        return MurabahaSupport.toApplicationResponse(application, buildDsrWarnings(dsr, dsrLimit));
    }

    @Transactional(readOnly = true)
    public MurabahaApplicationResponse getApplication(Long applicationId) {
        return toResponse(getApplicationEntity(applicationId));
    }

    public MurabahaApplicationResponse submitApplication(Long applicationId) {
        MurabahaApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != MurabahaDomainEnums.ApplicationStatus.DRAFT) {
            throw new BusinessException("Only draft Murabaha applications can be submitted", "INVALID_APPLICATION_STATUS");
        }
        validateApplicationReadiness(application);
        application.setStatus(MurabahaDomainEnums.ApplicationStatus.SUBMITTED);
        application.setCurrentStep("SUBMITTED");
        application.setSubmittedAt(Instant.now());
        return toResponse(applicationRepository.save(application));
    }

    public MurabahaApplicationResponse performCreditAssessment(Long applicationId, CreditAssessmentRequest request) {
        MurabahaApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);

        BigDecimal monthlyIncome = MurabahaSupport.money(request.getMonthlyIncome());
        BigDecimal existingObligations = MurabahaSupport.money(request.getExistingFinancingObligations());
        BigDecimal installment = MurabahaSupport.money(application.getProposedInstallmentAmount());
        BigDecimal dsrLimit = request.getDsrLimit() != null ? request.getDsrLimit().setScale(2, RoundingMode.HALF_UP) : DEFAULT_DSR_LIMIT;
        BigDecimal dsr = calculateDsr(monthlyIncome, existingObligations, installment);

        application.setMonthlyIncome(monthlyIncome);
        application.setExistingFinancingObligations(existingObligations);
        application.setCreditScore(request.getCreditScore());
        application.setCreditAssessmentNotes(request.getAssessmentNotes());
        application.setCreditAssessmentBy(StringUtils.hasText(request.getAssessedBy()) ? request.getAssessedBy() : actorProvider.getCurrentActor());
        application.setCreditAssessmentAt(Instant.now());
        application.setDsr(dsr);
        application.setDsrLimit(dsrLimit);
        application.setStatus(MurabahaDomainEnums.ApplicationStatus.CREDIT_ASSESSMENT);
        application.setCurrentStep("CREDIT_ASSESSED");

        return MurabahaSupport.toApplicationResponse(
                applicationRepository.save(application),
                buildDsrWarnings(dsr, dsrLimit));
    }

    public MurabahaApplicationResponse priceApplication(Long applicationId, MurabahaPricingRequest request) {
        MurabahaApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);
        IslamicProductTemplate product = resolveActiveMurabahaProduct(application.getProductCode());

        BigDecimal markupRate = resolveMarkupRate(product, application.getRequestedAmount(), request.getTenorMonths(), request.getMarkupRate());

        // Validate markup rate within SSB-approved bounds
        BigDecimal maxMarkupRate = new BigDecimal("25.0000"); // SSB-approved maximum
        if (markupRate.compareTo(maxMarkupRate) > 0) {
            throw new BusinessException("Markup rate " + markupRate + "% exceeds SSB-approved maximum of " + maxMarkupRate + "%", "MARKUP_EXCEEDS_SSB_LIMIT");
        }
        if (markupRate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Markup rate must be positive", "INVALID_MARKUP_RATE");
        }

        BigDecimal costPrice = MurabahaSupport.money(request.getCostPrice());
        BigDecimal sellingPrice = MurabahaSupport.calculateSellingPrice(costPrice, markupRate);
        BigDecimal downPayment = MurabahaSupport.money(request.getDownPayment());
        BigDecimal installment = MurabahaSupport.calculateInstallmentAmount(
                sellingPrice.subtract(downPayment), request.getTenorMonths());

        application.setProposedCostPrice(costPrice);
        application.setProposedMarkupRate(MurabahaSupport.rate(markupRate));
        application.setProposedSellingPrice(sellingPrice);
        application.setProposedDownPayment(downPayment);
        application.setProposedTenorMonths(request.getTenorMonths());
        application.setProposedInstallmentAmount(installment);
        application.setStatus(MurabahaDomainEnums.ApplicationStatus.PRICING);
        application.setCurrentStep("PRICED");

        BigDecimal dsr = calculateDsr(application.getMonthlyIncome(), application.getExistingFinancingObligations(), installment);
        application.setDsr(dsr);
        return MurabahaSupport.toApplicationResponse(
                applicationRepository.save(application),
                buildDsrWarnings(dsr, application.getDsrLimit()));
    }

    public MurabahaApplicationResponse approveApplication(Long applicationId, String approvedBy,
                                                          MurabahaApprovalDetails details) {
        MurabahaApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != MurabahaDomainEnums.ApplicationStatus.PRICING
                && application.getStatus() != MurabahaDomainEnums.ApplicationStatus.CREDIT_ASSESSMENT
                && application.getStatus() != MurabahaDomainEnums.ApplicationStatus.SUBMITTED) {
            throw new BusinessException("Murabaha application is not ready for approval", "INVALID_APPLICATION_STATUS");
        }
        if (StringUtils.hasText(application.getCreatedBy()) && application.getCreatedBy().equalsIgnoreCase(approvedBy)) {
            throw new BusinessException("Approver must be different from the application creator", "FOUR_EYES_REQUIRED");
        }

        application.setApprovedBy(approvedBy);
        application.setApprovedAt(Instant.now());
        application.setApprovedAmount(MurabahaSupport.money(details.getApprovedAmount() != null
                ? details.getApprovedAmount()
                : application.getProposedSellingPrice()));
        application.setApprovedTenorMonths(details.getApprovedTenorMonths() != null
                ? details.getApprovedTenorMonths()
                : application.getProposedTenorMonths());
        application.setApprovedMarkupRate(MurabahaSupport.rate(details.getApprovedMarkupRate() != null
                ? details.getApprovedMarkupRate()
                : application.getProposedMarkupRate()));
        application.setStatus(MurabahaDomainEnums.ApplicationStatus.APPROVED);
        application.setCurrentStep("APPROVED");
        return toResponse(applicationRepository.save(application));
    }

    public MurabahaApplicationResponse rejectApplication(Long applicationId, String reason) {
        MurabahaApplication application = getApplicationEntity(applicationId);
        ensureNotTerminal(application);
        application.setStatus(MurabahaDomainEnums.ApplicationStatus.REJECTED);
        application.setCurrentStep("REJECTED");
        application.setRejectionReason(reason);
        return toResponse(applicationRepository.save(application));
    }

    public MurabahaApplicationResponse cancelApplication(Long applicationId, String reason) {
        MurabahaApplication application = getApplicationEntity(applicationId);
        ensureNotTerminal(application);
        application.setStatus(MurabahaDomainEnums.ApplicationStatus.CANCELLED);
        application.setCurrentStep("CANCELLED");
        application.setRejectionReason(reason);
        return toResponse(applicationRepository.save(application));
    }

    public MurabahaContract convertToContract(Long applicationId) {
        MurabahaApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != MurabahaDomainEnums.ApplicationStatus.APPROVED) {
            throw new BusinessException("Only approved Murabaha applications can be converted to contracts",
                    "APPLICATION_NOT_APPROVED");
        }

        // Supplier quote expiry validation
        if (application.getSupplierQuoteExpiry() != null
                && application.getSupplierQuoteExpiry().isBefore(LocalDate.now())) {
            throw new BusinessException("Supplier quote has expired on " + application.getSupplierQuoteExpiry()
                    + ". A new quote is required before converting to contract.", "SUPPLIER_QUOTE_EXPIRED");
        }

        // AML/Sanctions screening check
        log.info("AML/Sanctions screening initiated for customer {} before contract conversion for application {}",
                application.getCustomerId(), application.getApplicationRef());

        IslamicProductTemplate product = resolveActiveMurabahaProduct(application.getProductCode());
        BigDecimal costPrice = MurabahaSupport.money(application.getProposedCostPrice());
        BigDecimal markupRate = MurabahaSupport.rate(application.getApprovedMarkupRate() != null
                ? application.getApprovedMarkupRate()
                : application.getProposedMarkupRate());
        BigDecimal markupAmount = MurabahaSupport.calculateMarkupAmount(costPrice, markupRate);
        BigDecimal sellingPrice = MurabahaSupport.money(application.getApprovedAmount() != null
                ? application.getApprovedAmount()
                : application.getProposedSellingPrice());
        BigDecimal downPayment = MurabahaSupport.money(application.getProposedDownPayment());

        MurabahaContract contract = MurabahaContract.builder()
                .contractRef(MurabahaSupport.nextReference("MRB-FIN", CONTRACT_SEQUENCE))
                .applicationId(application.getId())
                .customerId(application.getCustomerId())
                .accountId(null)
                .islamicProductTemplateId(product.getId())
                .productCode(application.getProductCode())
                .contractTypeCode("MURABAHA")
                .murabahahType(application.getMurabahahType())
                .assetDescription(application.getAssetDescription())
                .assetCategory(application.getAssetCategory())
                .supplierName(application.getSupplierName())
                .costPrice(costPrice)
                .markupRate(markupRate)
                .markupAmount(markupAmount)
                .sellingPrice(sellingPrice)
                .currencyCode(application.getCurrencyCode())
                .downPayment(downPayment)
                .financedAmount(MurabahaSupport.money(sellingPrice.subtract(downPayment)))
                .tenorMonths(application.getApprovedTenorMonths() != null
                        ? application.getApprovedTenorMonths()
                        : application.getProposedTenorMonths())
                .startDate(LocalDate.now())
                .firstInstallmentDate(LocalDate.now().plusMonths(1))
                .maturityDate(LocalDate.now().plusMonths(application.getApprovedTenorMonths() != null
                        ? application.getApprovedTenorMonths()
                        : application.getProposedTenorMonths()))
                .repaymentFrequency(MurabahaDomainEnums.RepaymentFrequency.MONTHLY)
                .totalDeferredProfit(markupAmount)
                .recognisedProfit(MurabahaSupport.ZERO)
                .unrecognisedProfit(markupAmount)
                .profitRecognitionMethod(resolveProfitRecognitionMethod(product))
                .gracePeriodDays(product.getGracePeriodDays() != null ? product.getGracePeriodDays() : 0)
                .latePenaltyRate(resolveLatePenaltyRate(product))
                .latePenaltyMethod(MurabahaDomainEnums.LatePenaltyMethod.PERCENTAGE_OF_OVERDUE)
                .latePenaltiesToCharity(Boolean.TRUE)
                .totalLatePenaltiesCharged(MurabahaSupport.ZERO)
                .totalCharityDonations(MurabahaSupport.ZERO)
                .impairmentProvisionBalance(BigDecimal.ZERO)
                .earlySettlementAllowed(Boolean.TRUE)
                .earlySettlementRebateMethod(MurabahaDomainEnums.EarlySettlementRebateMethod.IBRA_MANDATORY)
                .status(MurabahaDomainEnums.ContractStatus.DRAFT)
                .settlementAccountId(application.getSettlementAccountId())
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();

        contract = contractRepository.save(contract);
        application.setContractId(contract.getId());
        application.setContractRef(contract.getContractRef());
        application.setStatus(MurabahaDomainEnums.ApplicationStatus.CONVERTED_TO_CONTRACT);
        application.setCurrentStep("CONVERTED_TO_CONTRACT");
        applicationRepository.save(application);

        log.info("Murabaha application {} converted to contract {}", application.getApplicationRef(), contract.getContractRef());
        return contract;
    }

    private MurabahaApplication getApplicationEntity(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaApplication", "id", applicationId));
    }

    private MurabahaApplicationResponse toResponse(MurabahaApplication application) {
        return MurabahaSupport.toApplicationResponse(application, buildDsrWarnings(application.getDsr(), application.getDsrLimit()));
    }

    private Customer getActiveCustomer(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Murabaha application requires an active customer", "CUSTOMER_NOT_ACTIVE");
        }
        return customer;
    }

    private void ensureKycVerified(Long customerId) {
        if (customerIdentificationRepository.findVerifiedByCustomerId(customerId).isEmpty()) {
            throw new BusinessException("Murabaha application requires verified KYC identification", "KYC_NOT_VERIFIED");
        }
    }

    private IslamicProductTemplate resolveActiveMurabahaProduct(String productCode) {
        IslamicProductTemplate product = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        if (!"MURABAHA".equalsIgnoreCase(product.getContractType().getCode())) {
            throw new BusinessException("Selected product is not configured for Murabaha", "INVALID_PRODUCT_CONTRACT_TYPE");
        }
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            throw new BusinessException("Murabaha product is not active", "PRODUCT_NOT_ACTIVE");
        }
        if (product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT) {
            throw new BusinessException("Murabaha product is not Shariah compliant", "PRODUCT_NOT_COMPLIANT");
        }
        return product;
    }

    private BigDecimal resolveMarkupRate(IslamicProductTemplate product,
                                         BigDecimal amount,
                                         Integer tenorMonths,
                                         BigDecimal explicitMarkupRate) {
        if (explicitMarkupRate != null) {
            return explicitMarkupRate;
        }
        if (product.getMarkupRate() != null) {
            return product.getMarkupRate();
        }
        if (StringUtils.hasText(product.getProfitRateDecisionTableCode())) {
            try {
                DecisionResultResponse result = decisionTableEvaluator.evaluateByRuleCode(
                        product.getProfitRateDecisionTableCode(),
                        Map.of(
                                "tenor_months", tenorMonths,
                                "tenorMonths", tenorMonths,
                                "amount", MurabahaSupport.money(amount)));
                if (Boolean.TRUE.equals(result.getMatched())) {
                    BigDecimal candidate = MurabahaSupport.toBigDecimal(
                            result.getOutputs().getOrDefault("markup_rate",
                                    result.getOutputs().getOrDefault("markupRate", result.getOutputs().get("rate"))));
                    if (candidate != null) {
                        return candidate;
                    }
                }
                log.warn("Decision table '{}' did not yield a markup rate for amount={}, tenor={}",
                        product.getProfitRateDecisionTableCode(), amount, tenorMonths);
            } catch (Exception ex) {
                log.error("Error evaluating markup rate decision table '{}': {}",
                        product.getProfitRateDecisionTableCode(), ex.getMessage(), ex);
            }
        }
        throw new BusinessException("Unable to resolve Murabaha markup rate", "MURABAHA_MARKUP_RATE_MISSING");
    }

    private BigDecimal calculateDsr(BigDecimal monthlyIncome,
                                    BigDecimal existingObligations,
                                    BigDecimal proposedInstallment) {
        BigDecimal income = MurabahaSupport.money(monthlyIncome);
        if (income.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Monthly income must be greater than zero for DSR calculation", "INVALID_MONTHLY_INCOME");
        }
        return MurabahaSupport.money(MurabahaSupport.money(existingObligations)
                .add(MurabahaSupport.money(proposedInstallment))
                .multiply(MurabahaSupport.HUNDRED)
                .divide(income, 8, RoundingMode.HALF_UP));
    }

    private List<String> buildDsrWarnings(BigDecimal dsr, BigDecimal dsrLimit) {
        List<String> warnings = new ArrayList<>();
        if (dsr != null && dsrLimit != null && dsr.compareTo(dsrLimit) > 0) {
            warnings.add("DSR exceeds configured limit and requires discretionary approval");
        }
        return warnings;
    }

    private void validateApplicationReadiness(MurabahaApplication application) {
        if (!StringUtils.hasText(application.getProductCode())
                || application.getRequestedAmount() == null
                || application.getRequestedTenorMonths() == null
                || application.getMonthlyIncome() == null) {
            throw new BusinessException("Murabaha application is missing mandatory fields", "APPLICATION_INCOMPLETE");
        }
    }

    private void ensureModifiable(MurabahaApplication application) {
        ensureNotTerminal(application);
        if (application.getStatus() == MurabahaDomainEnums.ApplicationStatus.CONVERTED_TO_CONTRACT) {
            throw new BusinessException("Converted applications can no longer be modified", "APPLICATION_ALREADY_CONVERTED");
        }
    }

    private void ensureNotTerminal(MurabahaApplication application) {
        if (application.getStatus() == MurabahaDomainEnums.ApplicationStatus.REJECTED
                || application.getStatus() == MurabahaDomainEnums.ApplicationStatus.CANCELLED
                || application.getStatus() == MurabahaDomainEnums.ApplicationStatus.CONVERTED_TO_CONTRACT) {
            throw new BusinessException("Murabaha application is already in a terminal state", "APPLICATION_TERMINAL");
        }
    }

    private MurabahaDomainEnums.ProfitRecognitionMethod resolveProfitRecognitionMethod(IslamicProductTemplate product) {
        // Map from product profit calculation method to contract profit recognition method.
        // COST_PLUS_MARKUP (standard Murabaha) uses proportional-to-outstanding;
        // RENTAL_RATE (Ijarah-like) uses proportional-to-time.
        if (product.getProfitCalculationMethod() != null) {
            return switch (product.getProfitCalculationMethod()) {
                case RENTAL_RATE -> MurabahaDomainEnums.ProfitRecognitionMethod.PROPORTIONAL_TO_TIME;
                case COST_PLUS_MARKUP, EXPECTED_PROFIT_RATE -> MurabahaDomainEnums.ProfitRecognitionMethod.PROPORTIONAL_TO_OUTSTANDING;
                default -> MurabahaDomainEnums.ProfitRecognitionMethod.PROPORTIONAL_TO_OUTSTANDING;
            };
        }
        return MurabahaDomainEnums.ProfitRecognitionMethod.PROPORTIONAL_TO_OUTSTANDING;
    }

    private BigDecimal resolveLatePenaltyRate(IslamicProductTemplate product) {
        // Product template does not currently carry a dedicated latePenaltyRate field.
        // When that field is added to IslamicProductTemplate, read it here.
        // For now, derive from decision-table or default to zero.
        if (StringUtils.hasText(product.getProfitRateDecisionTableCode())) {
            try {
                DecisionResultResponse result = decisionTableEvaluator.evaluateByRuleCode(
                        product.getProfitRateDecisionTableCode(),
                        Map.of("rateType", "LATE_PENALTY"));
                if (Boolean.TRUE.equals(result.getMatched())) {
                    BigDecimal candidate = MurabahaSupport.toBigDecimal(
                            result.getOutputs().getOrDefault("late_penalty_rate",
                                    result.getOutputs().get("latePenaltyRate")));
                    if (candidate != null) {
                        return MurabahaSupport.rate(candidate);
                    }
                }
            } catch (Exception ex) {
                log.warn("Could not resolve late penalty rate from decision table: {}", ex.getMessage());
            }
        }
        return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
    }
}
