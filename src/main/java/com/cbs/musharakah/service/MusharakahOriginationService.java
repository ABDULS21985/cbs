package com.cbs.musharakah.service;

import com.cbs.account.repository.ProductRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahApplication;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.repository.MusharakahApplicationRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
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
@Transactional
@lombok.extern.slf4j.Slf4j
public class MusharakahOriginationService {

    private static final AtomicLong APPLICATION_SEQUENCE = new AtomicLong(System.nanoTime());
    private static final AtomicLong CONTRACT_SEQUENCE = new AtomicLong(System.nanoTime());
    private static final BigDecimal DEFAULT_DSR_LIMIT = new BigDecimal("50.00");
    private static final String RENTAL_RATE_DECISION_TABLE = "MSH_RENTAL_RATE_BY_AMOUNT_TENOR";

    private final MusharakahApplicationRepository applicationRepository;
    private final MusharakahContractRepository contractRepository;
    private final CustomerRepository customerRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final ProductRepository productRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final DecisionTableEvaluator decisionTableEvaluator;
    private final CurrentTenantResolver currentTenantResolver;
    private final CurrentActorProvider actorProvider;

    public MusharakahResponses.MusharakahApplicationResponse createApplication(MusharakahRequests.CreateApplicationRequest request) {
        Customer customer = getActiveCustomer(request.getCustomerId());
        ensureKycVerified(customer.getId());

        // Check for duplicate active applications for the same customer
        List<MusharakahApplication> activeApplications = applicationRepository.findByCustomerIdAndStatusIn(
                customer.getId(),
                List.of(MusharakahDomainEnums.ApplicationStatus.DRAFT,
                        MusharakahDomainEnums.ApplicationStatus.SUBMITTED,
                        MusharakahDomainEnums.ApplicationStatus.PRICING,
                        MusharakahDomainEnums.ApplicationStatus.ASSET_VALUATION,
                        MusharakahDomainEnums.ApplicationStatus.APPROVED));
        boolean duplicateExists = activeApplications.stream()
                .anyMatch(app -> request.getProductCode().equalsIgnoreCase(app.getProductCode())
                        && request.getAssetAddress() != null
                        && request.getAssetAddress().equalsIgnoreCase(app.getAssetAddress()));
        if (duplicateExists) {
            throw new BusinessException("An active Musharakah application already exists for this customer with the same product and asset",
                    "DUPLICATE_APPLICATION");
        }

        IslamicProductTemplate product = resolveActiveMusharakahProduct(request.getProductCode());
        productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        validateCapitalConservation(request.getRequestedFinancingAmount(), request.getCustomerEquityAmount(), request.getTotalPropertyValue());
        validateMinimumCustomerEquity(product, request.getCustomerEquityAmount(), request.getTotalPropertyValue());

        BigDecimal bankPercentage = MusharakahSupport.percentage(request.getRequestedFinancingAmount(), request.getTotalPropertyValue());
        BigDecimal customerPercentage = MusharakahSupport.percentage(request.getCustomerEquityAmount(), request.getTotalPropertyValue());
        int totalUnits = product.getDiminishingUnitsTotal() != null ? product.getDiminishingUnitsTotal() : 100;
        BigDecimal rentalRate = resolveRentalRate(product, request.getRequestedFinancingAmount(), request.getRequestedTenorMonths(), null);
        BigDecimal estimatedPayment = estimateMonthlyPayment(
                request.getRequestedFinancingAmount(),
                request.getTotalPropertyValue(),
                rentalRate,
                totalUnits,
                request.getRequestedTenorMonths());
        BigDecimal dsr = calculateDsr(request.getMonthlyIncome(), request.getExistingObligations(), estimatedPayment);

        MusharakahApplication application = MusharakahApplication.builder()
                .applicationRef(MusharakahSupport.nextReference("MSH-APP", APPLICATION_SEQUENCE))
                .customerId(customer.getId())
                .productCode(product.getProductCode())
                .musharakahType(request.getMusharakahType())
                .requestedFinancingAmount(MusharakahSupport.money(request.getRequestedFinancingAmount()))
                .customerEquityAmount(MusharakahSupport.money(request.getCustomerEquityAmount()))
                .totalPropertyValue(MusharakahSupport.money(request.getTotalPropertyValue()))
                .currencyCode(request.getCurrencyCode())
                .requestedTenorMonths(request.getRequestedTenorMonths())
                .assetDescription(request.getAssetDescription())
                .assetCategory(request.getAssetCategory())
                .assetAddress(request.getAssetAddress())
                .estimatedAssetValue(MusharakahSupport.money(
                        request.getEstimatedAssetValue() != null ? request.getEstimatedAssetValue() : request.getTotalPropertyValue()))
                .monthlyIncome(MusharakahSupport.money(request.getMonthlyIncome()))
                .existingObligations(MusharakahSupport.money(request.getExistingObligations()))
                .estimatedMonthlyPayment(estimatedPayment)
                .dsr(dsr)
                .proposedBankContribution(MusharakahSupport.money(request.getRequestedFinancingAmount()))
                .proposedCustomerContribution(MusharakahSupport.money(request.getCustomerEquityAmount()))
                .proposedBankPercentage(bankPercentage)
                .proposedCustomerPercentage(customerPercentage)
                .proposedRentalRate(rentalRate)
                .proposedTenorMonths(request.getRequestedTenorMonths())
                .proposedUnitsTotal(totalUnits)
                .proposedProfitSharingBank(MusharakahSupport.rate(
                        product.getProfitSharingRatioBank() != null ? product.getProfitSharingRatioBank() : bankPercentage))
                .proposedProfitSharingCustomer(MusharakahSupport.rate(
                        product.getProfitSharingRatioCustomer() != null ? product.getProfitSharingRatioCustomer() : customerPercentage))
                .status(MusharakahDomainEnums.ApplicationStatus.DRAFT)
                .branchId(request.getBranchId())
                .expiresAt(Instant.now().plusSeconds(30L * 24 * 60 * 60))
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();

        application = applicationRepository.save(application);
        return MusharakahSupport.toApplicationResponse(application, buildDsrWarnings(dsr, DEFAULT_DSR_LIMIT));
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahApplicationResponse getApplication(Long applicationId) {
        return MusharakahSupport.toApplicationResponse(getApplicationEntity(applicationId), List.of());
    }

    public MusharakahResponses.MusharakahApplicationResponse submitApplication(Long applicationId) {
        MusharakahApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != MusharakahDomainEnums.ApplicationStatus.DRAFT) {
            throw new BusinessException("Only draft Musharakah applications can be submitted", "INVALID_APPLICATION_STATUS");
        }
        application.setStatus(MusharakahDomainEnums.ApplicationStatus.SUBMITTED);
        application.setSubmittedAt(Instant.now());
        return MusharakahSupport.toApplicationResponse(applicationRepository.save(application), List.of());
    }

    public MusharakahResponses.MusharakahApplicationResponse performValuation(Long applicationId,
                                                                              MusharakahRequests.ValuationRequest request) {
        MusharakahApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);
        application.setEstimatedAssetValue(MusharakahSupport.money(request.getValuationAmount()));
        application.setValuationReference(request.getValuationReference());
        application.setTotalPropertyValue(MusharakahSupport.money(request.getValuationAmount()));
        if (application.getRequestedFinancingAmount().add(application.getCustomerEquityAmount())
                .compareTo(application.getTotalPropertyValue()) > 0) {
            application.setRequestedFinancingAmount(MusharakahSupport.money(
                    application.getTotalPropertyValue().subtract(application.getCustomerEquityAmount())));
        }

        // Recalculate downstream figures after value adjustment
        BigDecimal bankPercentage = MusharakahSupport.percentage(application.getRequestedFinancingAmount(), application.getTotalPropertyValue());
        BigDecimal customerPercentage = MusharakahSupport.percentage(application.getCustomerEquityAmount(), application.getTotalPropertyValue());
        application.setProposedBankPercentage(bankPercentage);
        application.setProposedCustomerPercentage(customerPercentage);
        application.setProposedBankContribution(MusharakahSupport.money(application.getRequestedFinancingAmount()));
        application.setProposedCustomerContribution(MusharakahSupport.money(application.getCustomerEquityAmount()));

        IslamicProductTemplate product = resolveActiveMusharakahProduct(application.getProductCode());
        int totalUnits = application.getProposedUnitsTotal() != null ? application.getProposedUnitsTotal() : 100;
        BigDecimal rentalRate = resolveRentalRate(product, application.getRequestedFinancingAmount(),
                application.getRequestedTenorMonths(), null);
        application.setProposedRentalRate(rentalRate);
        BigDecimal estimatedPayment = estimateMonthlyPayment(
                application.getRequestedFinancingAmount(),
                application.getTotalPropertyValue(),
                rentalRate,
                totalUnits,
                application.getRequestedTenorMonths());
        application.setEstimatedMonthlyPayment(estimatedPayment);
        application.setDsr(calculateDsr(application.getMonthlyIncome(), application.getExistingObligations(), estimatedPayment));

        application.setStatus(MusharakahDomainEnums.ApplicationStatus.ASSET_VALUATION);
        return MusharakahSupport.toApplicationResponse(applicationRepository.save(application), List.of());
    }

    public MusharakahResponses.MusharakahApplicationResponse priceApplication(Long applicationId,
                                                                              MusharakahRequests.PricingRequest request) {
        MusharakahApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);
        IslamicProductTemplate product = resolveActiveMusharakahProduct(application.getProductCode());

        validateCapitalConservation(request.getBankContribution(), request.getCustomerContribution(), application.getTotalPropertyValue());
        validateMinimumCustomerEquity(product, request.getCustomerContribution(), application.getTotalPropertyValue());
        validateRatioConservation(request.getProfitSharingRatioBank(), request.getProfitSharingRatioCustomer(), "INVALID_PROFIT_RATIO");

        BigDecimal bankPercentage = MusharakahSupport.percentage(request.getBankContribution(), application.getTotalPropertyValue());
        BigDecimal customerPercentage = MusharakahSupport.percentage(request.getCustomerContribution(), application.getTotalPropertyValue());
        validateRatioConservation(bankPercentage, customerPercentage, "INVALID_CAPITAL_RATIO");

        BigDecimal rentalRate = resolveRentalRate(product, request.getBankContribution(), request.getTenorMonths(), request.getRentalRate());
        BigDecimal estimatedPayment = estimateMonthlyPayment(
                request.getBankContribution(),
                application.getTotalPropertyValue(),
                rentalRate,
                request.getTotalUnits(),
                request.getTenorMonths());
        BigDecimal dsr = calculateDsr(application.getMonthlyIncome(), application.getExistingObligations(), estimatedPayment);

        application.setProposedBankContribution(MusharakahSupport.money(request.getBankContribution()));
        application.setProposedCustomerContribution(MusharakahSupport.money(request.getCustomerContribution()));
        application.setProposedBankPercentage(bankPercentage);
        application.setProposedCustomerPercentage(customerPercentage);
        application.setProposedRentalRate(MusharakahSupport.rate(rentalRate));
        application.setProposedTenorMonths(request.getTenorMonths());
        application.setProposedUnitsTotal(request.getTotalUnits());
        application.setProposedProfitSharingBank(MusharakahSupport.rate(request.getProfitSharingRatioBank()));
        application.setProposedProfitSharingCustomer(MusharakahSupport.rate(request.getProfitSharingRatioCustomer()));
        application.setEstimatedMonthlyPayment(estimatedPayment);
        application.setDsr(dsr);
        application.setStatus(MusharakahDomainEnums.ApplicationStatus.PRICING);
        return MusharakahSupport.toApplicationResponse(applicationRepository.save(application), buildDsrWarnings(dsr, DEFAULT_DSR_LIMIT));
    }

    public MusharakahResponses.MusharakahApplicationResponse approveApplication(Long applicationId, String approvedBy) {
        MusharakahApplication application = getApplicationEntity(applicationId);
        if (application.getExpiresAt() != null && application.getExpiresAt().isBefore(Instant.now())) {
            application.setStatus(MusharakahDomainEnums.ApplicationStatus.EXPIRED);
            applicationRepository.save(application);
            throw new BusinessException("Musharakah application has expired", "APPLICATION_EXPIRED");
        }
        if (application.getStatus() != MusharakahDomainEnums.ApplicationStatus.PRICING
                && application.getStatus() != MusharakahDomainEnums.ApplicationStatus.ASSET_VALUATION
                && application.getStatus() != MusharakahDomainEnums.ApplicationStatus.SUBMITTED) {
            throw new BusinessException("Musharakah application is not ready for approval", "INVALID_APPLICATION_STATUS");
        }
        if (StringUtils.hasText(application.getCreatedBy()) && application.getCreatedBy().equalsIgnoreCase(approvedBy)) {
            throw new BusinessException("Approver must be different from the application creator", "FOUR_EYES_REQUIRED");
        }
        application.setApprovedBy(approvedBy);
        application.setApprovedAt(Instant.now());
        application.setStatus(MusharakahDomainEnums.ApplicationStatus.APPROVED);
        return MusharakahSupport.toApplicationResponse(applicationRepository.save(application), List.of());
    }

    public MusharakahResponses.MusharakahApplicationResponse rejectApplication(Long applicationId, String reason) {
        MusharakahApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() == MusharakahDomainEnums.ApplicationStatus.CONVERTED
                || application.getStatus() == MusharakahDomainEnums.ApplicationStatus.CANCELLED
                || application.getStatus() == MusharakahDomainEnums.ApplicationStatus.REJECTED) {
            throw new BusinessException(
                    "Cannot reject application in terminal status: " + application.getStatus(),
                    "INVALID_APPLICATION_STATUS");
        }
        application.setStatus(MusharakahDomainEnums.ApplicationStatus.REJECTED);
        application.setRejectionReason(reason);
        return MusharakahSupport.toApplicationResponse(applicationRepository.save(application), List.of());
    }

    public MusharakahContract convertToContract(Long applicationId) {
        MusharakahApplication application = getApplicationEntity(applicationId);
        if (application.getExpiresAt() != null && application.getExpiresAt().isBefore(Instant.now())) {
            application.setStatus(MusharakahDomainEnums.ApplicationStatus.EXPIRED);
            applicationRepository.save(application);
            throw new BusinessException("Musharakah application has expired", "APPLICATION_EXPIRED");
        }
        if (application.getStatus() != MusharakahDomainEnums.ApplicationStatus.APPROVED) {
            throw new BusinessException("Musharakah application must be approved before conversion", "INVALID_APPLICATION_STATUS");
        }

        IslamicProductTemplate product = resolveActiveMusharakahProduct(application.getProductCode());
        BigDecimal totalCapital = MusharakahSupport.money(application.getTotalPropertyValue());
        BigDecimal bankContribution = MusharakahSupport.money(application.getProposedBankContribution());
        BigDecimal customerContribution = MusharakahSupport.money(application.getProposedCustomerContribution());
        int totalUnits = application.getProposedUnitsTotal() != null ? application.getProposedUnitsTotal() : 100;
        BigDecimal unitValue = MusharakahSupport.unitPrice(
                totalCapital.divide(BigDecimal.valueOf(totalUnits), 8, RoundingMode.HALF_UP));
        BigDecimal bankUnits = MusharakahSupport.units(
                bankContribution.divide(unitValue, 8, RoundingMode.HALF_UP));
        BigDecimal customerUnits = MusharakahSupport.units(BigDecimal.valueOf(totalUnits).subtract(bankUnits));
        BigDecimal estimatedBuyout = MusharakahSupport.money(bankUnits.multiply(unitValue));

        MusharakahContract contract = MusharakahContract.builder()
                .contractRef(MusharakahSupport.nextReference("MSH-FIN", CONTRACT_SEQUENCE))
                .applicationId(application.getId())
                .customerId(application.getCustomerId())
                .islamicProductTemplateId(product.getId())
                .productCode(product.getProductCode())
                .contractTypeCode("MUSHARAKAH")
                .musharakahType(application.getMusharakahType())
                .assetDescription(application.getAssetDescription())
                .assetCategory(application.getAssetCategory())
                .assetAddress(application.getAssetAddress())
                .assetPurchasePrice(totalCapital)
                .assetCurrentMarketValue(MusharakahSupport.money(application.getEstimatedAssetValue()))
                .assetLastValuationDate(LocalDate.now())
                .currencyCode(application.getCurrencyCode())
                .bankCapitalContribution(bankContribution)
                .customerCapitalContribution(customerContribution)
                .totalCapital(totalCapital)
                .totalOwnershipUnits(totalUnits)
                .bankCurrentUnits(bankUnits)
                .customerCurrentUnits(customerUnits)
                .bankOwnershipPercentage(MusharakahSupport.rate(application.getProposedBankPercentage()))
                .customerOwnershipPercentage(MusharakahSupport.rate(application.getProposedCustomerPercentage()))
                .unitValue(unitValue)
                .unitPricingMethod(product.getDiminishingSchedule() != null && product.getDiminishingSchedule()
                        ? MusharakahDomainEnums.UnitPricingMethod.FIXED_AT_INCEPTION
                        : MusharakahDomainEnums.UnitPricingMethod.AGREED_SCHEDULE)
                .profitSharingRatioBank(MusharakahSupport.rate(application.getProposedProfitSharingBank()))
                .profitSharingRatioCustomer(MusharakahSupport.rate(application.getProposedProfitSharingCustomer()))
                .lossSharingMethod(MusharakahDomainEnums.LossSharingMethod.PROPORTIONAL_TO_CAPITAL)
                .rentalFrequency(MusharakahDomainEnums.RentalFrequency.MONTHLY)
                .baseRentalRate(MusharakahSupport.rate(application.getProposedRentalRate()))
                .rentalRateType(MusharakahDomainEnums.RentalRateType.VARIABLE_BENCHMARK)
                .rentalBenchmark(product.getBaseRateReference())
                .rentalMargin(product.getMargin())
                .rentalReviewFrequency(MusharakahDomainEnums.RentalReviewFrequency.ANNUAL)
                .nextRentalReviewDate(LocalDate.now().plusYears(1))
                .totalRentalExpected(MusharakahSupport.ZERO)
                .totalRentalReceived(MusharakahSupport.ZERO)
                .buyoutFrequency(MusharakahDomainEnums.BuyoutFrequency.MONTHLY)
                .unitsPerBuyoutDecimal(MusharakahSupport.units(
                        bankUnits.divide(BigDecimal.valueOf(Math.max(application.getProposedTenorMonths(), 1)), 8, RoundingMode.HALF_UP)))
                .totalBuyoutPaymentsExpected(estimatedBuyout)
                .totalBuyoutPaymentsReceived(MusharakahSupport.ZERO)
                .tenorMonths(application.getProposedTenorMonths())
                .startDate(LocalDate.now())
                .maturityDate(LocalDate.now().plusMonths(application.getProposedTenorMonths()))
                .firstPaymentDate(LocalDate.now().plusMonths(1))
                .estimatedMonthlyPayment(MusharakahSupport.money(application.getEstimatedMonthlyPayment()))
                .gracePeriodDays(product.getGracePeriodDays() != null ? product.getGracePeriodDays() : 0)
                .latePenaltyToCharity(Boolean.TRUE.equals(product.getLatePenaltyToCharity()))
                .totalLatePenalties(MusharakahSupport.ZERO)
                .totalCharityDonations(MusharakahSupport.ZERO)
                .insuranceResponsibility(MusharakahDomainEnums.InsuranceResponsibility.PROPORTIONAL)
                .majorMaintenanceSharing(MusharakahDomainEnums.MajorMaintenanceSharing.PROPORTIONAL_TO_OWNERSHIP)
                .earlyBuyoutAllowed(true)
                .earlyBuyoutPricingMethod(MusharakahDomainEnums.EarlyBuyoutPricingMethod.REMAINING_UNITS_AT_FIXED)
                .status(MusharakahDomainEnums.ContractStatus.DRAFT)
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();

        contract = contractRepository.save(contract);
        application.setContractId(contract.getId());
        application.setStatus(MusharakahDomainEnums.ApplicationStatus.CONVERTED);
        applicationRepository.save(application);
        return contract;
    }

    private MusharakahApplication getApplicationEntity(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahApplication", "id", applicationId));
    }

    private Customer getActiveCustomer(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Musharakah requires an active customer", "CUSTOMER_NOT_ACTIVE");
        }
        return customer;
    }

    private void ensureKycVerified(Long customerId) {
        if (customerIdentificationRepository.findVerifiedByCustomerId(customerId).isEmpty()) {
            throw new BusinessException("Musharakah requires verified KYC identification", "KYC_NOT_VERIFIED");
        }
    }

    private IslamicProductTemplate resolveActiveMusharakahProduct(String productCode) {
        IslamicProductTemplate product = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        if (product.getContractType() == null || !"MUSHARAKAH".equalsIgnoreCase(product.getContractType().getCode())) {
            throw new BusinessException("Product is not configured for Musharakah", "INVALID_PRODUCT_CONTRACT_TYPE");
        }
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            throw new BusinessException("Musharakah product is not ACTIVE", "PRODUCT_INACTIVE");
        }
        if (product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT) {
            throw new BusinessException("Musharakah product is not Shariah compliant", "PRODUCT_NOT_COMPLIANT");
        }
        return product;
    }

    private void validateMinimumCustomerEquity(IslamicProductTemplate product, BigDecimal customerContribution, BigDecimal totalPropertyValue) {
        BigDecimal minimumRatio = product.getCustomerSharePercentage() != null
                ? product.getCustomerSharePercentage()
                : new BigDecimal("20.00");
        BigDecimal actualRatio = MusharakahSupport.percentage(customerContribution, totalPropertyValue);
        if (actualRatio.compareTo(minimumRatio) < 0) {
            throw new BusinessException("Customer contribution is below the minimum equity requirement", "MIN_CUSTOMER_EQUITY_NOT_MET");
        }
    }

    private void validateCapitalConservation(BigDecimal bankContribution, BigDecimal customerContribution, BigDecimal totalPropertyValue) {
        BigDecimal sum = MusharakahSupport.money(bankContribution).add(MusharakahSupport.money(customerContribution));
        if (sum.compareTo(MusharakahSupport.money(totalPropertyValue)) != 0) {
            throw new BusinessException("Bank and customer capital contributions must equal total asset value", "INVALID_CAPITAL_CONSERVATION");
        }
    }

    private void validateRatioConservation(BigDecimal bankRatio, BigDecimal customerRatio, String errorCode) {
        BigDecimal total = MusharakahSupport.rate(bankRatio).add(MusharakahSupport.rate(customerRatio));
        if (total.compareTo(new BigDecimal("100.0000")) != 0) {
            throw new BusinessException("Ratios must sum to 100.00", errorCode);
        }
    }

    private BigDecimal resolveRentalRate(IslamicProductTemplate product, BigDecimal amount, Integer tenorMonths, BigDecimal explicitRate) {
        if (explicitRate != null) {
            return MusharakahSupport.rate(explicitRate);
        }
        if (product.getBaseRate() != null && product.getMargin() != null) {
            return MusharakahSupport.rate(product.getBaseRate().add(product.getMargin()));
        }
        if (product.getFixedProfitRate() != null) {
            return MusharakahSupport.rate(product.getFixedProfitRate());
        }
        try {
            DecisionResultResponse result = decisionTableEvaluator.evaluateByRuleCode(
                    RENTAL_RATE_DECISION_TABLE,
                    Map.of("amount", MusharakahSupport.money(amount), "tenor_months", tenorMonths, "tenorMonths", tenorMonths));
            if (Boolean.TRUE.equals(result.getMatched())) {
                Object candidate = result.getOutputs().getOrDefault("rental_rate",
                        result.getOutputs().getOrDefault("rentalRate", result.getOutputs().get("rate")));
                if (candidate != null) {
                    return MusharakahSupport.rate(new BigDecimal(String.valueOf(candidate)));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to resolve rental rate from decision table '{}' for amount={}, tenor={}: {}",
                    RENTAL_RATE_DECISION_TABLE, amount, tenorMonths, e.getMessage());
        }
        return new BigDecimal("5.5000");
    }

    private BigDecimal estimateMonthlyPayment(BigDecimal bankContribution,
                                              BigDecimal totalPropertyValue,
                                              BigDecimal rentalRate,
                                              int totalUnits,
                                              int tenorMonths) {
        BigDecimal bankShareValue = MusharakahSupport.money(bankContribution);
        BigDecimal rental = MusharakahSupport.deriveMonthlyRental(
                bankShareValue,
                rentalRate,
                MusharakahDomainEnums.RentalFrequency.MONTHLY);
        BigDecimal unitValue = MusharakahSupport.unitPrice(
                MusharakahSupport.money(totalPropertyValue).divide(BigDecimal.valueOf(totalUnits), 8, RoundingMode.HALF_UP));
        BigDecimal bankUnits = MusharakahSupport.units(bankShareValue.divide(unitValue, 8, RoundingMode.HALF_UP));
        BigDecimal monthlyUnits = MusharakahSupport.units(bankUnits.divide(BigDecimal.valueOf(Math.max(tenorMonths, 1)), 8, RoundingMode.HALF_UP));
        BigDecimal buyout = MusharakahSupport.money(monthlyUnits.multiply(unitValue));
        return MusharakahSupport.money(rental.add(buyout));
    }

    private BigDecimal calculateDsr(BigDecimal monthlyIncome, BigDecimal existingObligations, BigDecimal proposedPayment) {
        BigDecimal income = MusharakahSupport.money(monthlyIncome);
        if (income.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        BigDecimal numerator = MusharakahSupport.money(existingObligations).add(MusharakahSupport.money(proposedPayment));
        return numerator.multiply(MusharakahSupport.HUNDRED).divide(income, 4, RoundingMode.HALF_UP);
    }

    private void ensureModifiable(MusharakahApplication application) {
        if (application.getStatus() == MusharakahDomainEnums.ApplicationStatus.APPROVED
                || application.getStatus() == MusharakahDomainEnums.ApplicationStatus.REJECTED
                || application.getStatus() == MusharakahDomainEnums.ApplicationStatus.CANCELLED
                || application.getStatus() == MusharakahDomainEnums.ApplicationStatus.CONVERTED) {
            throw new BusinessException("Musharakah application can no longer be modified", "IMMUTABLE_APPLICATION");
        }
    }

    private List<String> buildDsrWarnings(BigDecimal dsr, BigDecimal dsrLimit) {
        List<String> warnings = new ArrayList<>();
        if (dsr != null && dsrLimit != null && dsr.compareTo(dsrLimit) > 0) {
            warnings.add("DSR exceeds configured threshold of " + dsrLimit.toPlainString() + "%");
        }
        return warnings;
    }
}
