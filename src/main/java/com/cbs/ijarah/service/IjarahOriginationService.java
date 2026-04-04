package com.cbs.ijarah.service;

import com.cbs.account.repository.ProductRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahApplication;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahApplicationRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
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
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Transactional
public class IjarahOriginationService {

    private static final AtomicLong APPLICATION_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);
    private static final AtomicLong CONTRACT_SEQUENCE = new AtomicLong((System.currentTimeMillis() + 9000L) % 100000);
    private static final BigDecimal DEFAULT_DSR_LIMIT = new BigDecimal("50.00");

    private final IjarahApplicationRepository applicationRepository;
    private final IjarahContractRepository contractRepository;
    private final CustomerRepository customerRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final ProductRepository productRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final CurrentTenantResolver currentTenantResolver;
    private final CurrentActorProvider actorProvider;

    public IjarahResponses.IjarahApplicationResponse createApplication(IjarahRequests.CreateIjarahApplicationRequest request) {
        Customer customer = getActiveCustomer(request.getCustomerId());
        ensureKycVerified(customer.getId());
        IslamicProductTemplate product = resolveActiveIjarahProduct(request.getProductCode());
        productRepository.findByCode(product.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", product.getProductCode()));

        int totalPeriods = IjarahSupport.totalPeriods(request.getRequestedTenorMonths(), IjarahDomainEnums.RentalFrequency.MONTHLY);
        BigDecimal proposedRental = IjarahSupport.calculateRentalAmount(
                request.getEstimatedAssetCost(),
                BigDecimal.ZERO,
                request.getEstimatedAssetCost().multiply(new BigDecimal("0.10")),
                totalPeriods);
        BigDecimal dsr = calculateDsr(request.getMonthlyIncome(), request.getExistingObligations(), proposedRental);

        IjarahApplication application = IjarahApplication.builder()
                .applicationRef(IjarahSupport.nextReference("IJR-APP", APPLICATION_SEQUENCE))
                .customerId(customer.getId())
                .productCode(product.getProductCode())
                .ijarahType(request.getIjarahType())
                .requestedAssetDescription(request.getRequestedAssetDescription())
                .requestedAssetCategory(request.getRequestedAssetCategory())
                .estimatedAssetCost(IjarahSupport.money(request.getEstimatedAssetCost()))
                .requestedTenorMonths(request.getRequestedTenorMonths())
                .currencyCode(request.getCurrencyCode())
                .purpose(request.getPurpose() == null ? null : request.getPurpose().name())
                .monthlyIncome(IjarahSupport.money(request.getMonthlyIncome()))
                .existingObligations(IjarahSupport.money(request.getExistingObligations()))
                .proposedMonthlyRental(proposedRental)
                .dsrWithProposedRental(dsr)
                .proposedRentalAmount(proposedRental)
                .proposedRentalFrequency(IjarahDomainEnums.RentalFrequency.MONTHLY)
                .proposedAdvanceRentals(request.getProposedAdvanceRentals() != null ? request.getProposedAdvanceRentals() : 0)
                .proposedSecurityDeposit(IjarahSupport.money(request.getProposedSecurityDeposit()))
                .status(IjarahDomainEnums.ApplicationStatus.DRAFT)
                .branchId(request.getBranchId())
                .expiresAt(Instant.now().plusSeconds(30L * 24 * 60 * 60))
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();

        application = applicationRepository.save(application);
        return IjarahSupport.toApplicationResponse(application, buildDsrWarnings(dsr, DEFAULT_DSR_LIMIT));
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahApplicationResponse getApplication(Long applicationId) {
        return IjarahSupport.toApplicationResponse(getApplicationEntity(applicationId), List.of());
    }

    public IjarahResponses.IjarahApplicationResponse submitApplication(Long applicationId) {
        IjarahApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != IjarahDomainEnums.ApplicationStatus.DRAFT) {
            throw new BusinessException("Only draft Ijarah applications can be submitted", "INVALID_APPLICATION_STATUS");
        }
        application.setStatus(IjarahDomainEnums.ApplicationStatus.SUBMITTED);
        application.setSubmittedAt(Instant.now());
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application), List.of());
    }

    public IjarahResponses.IjarahApplicationResponse performCreditAssessment(Long applicationId,
                                                                       IjarahRequests.CreditAssessmentRequest request) {
        IjarahApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);

        BigDecimal monthlyIncome = IjarahSupport.money(request.getMonthlyIncome() != null
                ? request.getMonthlyIncome() : application.getMonthlyIncome());
        BigDecimal existingObligations = IjarahSupport.money(request.getExistingObligations() != null
                ? request.getExistingObligations() : application.getExistingObligations());
        BigDecimal dsr = calculateDsr(monthlyIncome, existingObligations, application.getProposedRentalAmount());
        BigDecimal limit = request.getDsrLimit() != null
                ? request.getDsrLimit().setScale(2, RoundingMode.HALF_UP)
                : DEFAULT_DSR_LIMIT;

        application.setMonthlyIncome(monthlyIncome);
        application.setExistingObligations(existingObligations);
        application.setCreditScore(request.getCreditScore());
        application.setDsrWithProposedRental(dsr);
        if (request.getAssignedOfficerId() != null) {
            application.setAssignedOfficerId(request.getAssignedOfficerId());
        }
        application.setStatus(IjarahDomainEnums.ApplicationStatus.CREDIT_ASSESSMENT);

        return IjarahSupport.toApplicationResponse(applicationRepository.save(application), buildDsrWarnings(dsr, limit));
    }

    public IjarahResponses.IjarahApplicationResponse priceApplication(Long applicationId, IjarahRequests.IjarahPricingRequest request) {
        IjarahApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);
        IslamicProductTemplate product = resolveActiveIjarahProduct(application.getProductCode());

        validateAmountAndTenor(product, request.getAssetCost(), request.getTenorMonths());
        int totalPeriods = IjarahSupport.totalPeriods(request.getTenorMonths(), request.getRentalFrequency());
        BigDecimal rental = IjarahSupport.calculateRentalAmount(
                request.getAssetCost(),
                request.getResidualValue(),
                request.getTargetProfit(),
                totalPeriods);
        BigDecimal dsr = calculateDsr(application.getMonthlyIncome(), application.getExistingObligations(), rental);

        application.setEstimatedAssetCost(IjarahSupport.money(request.getAssetCost()));
        application.setRequestedTenorMonths(request.getTenorMonths());
        application.setProposedMonthlyRental(rental);
        application.setProposedRentalAmount(rental);
        application.setProposedRentalFrequency(request.getRentalFrequency());
        application.setProposedAdvanceRentals(request.getAdvanceRentals() != null ? request.getAdvanceRentals() : 0);
        application.setProposedSecurityDeposit(IjarahSupport.money(request.getSecurityDeposit()));
        application.setDsrWithProposedRental(dsr);
        application.setStatus(IjarahDomainEnums.ApplicationStatus.PRICING);

        return IjarahSupport.toApplicationResponse(
                applicationRepository.save(application),
                buildDsrWarnings(dsr, DEFAULT_DSR_LIMIT));
    }

    public IjarahResponses.IjarahApplicationResponse approveApplication(Long applicationId, String approvedBy) {
        IjarahApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != IjarahDomainEnums.ApplicationStatus.PRICING
                && application.getStatus() != IjarahDomainEnums.ApplicationStatus.CREDIT_ASSESSMENT
                && application.getStatus() != IjarahDomainEnums.ApplicationStatus.SUBMITTED) {
            throw new BusinessException("Ijarah application is not ready for approval", "INVALID_APPLICATION_STATUS");
        }
        if (StringUtils.hasText(application.getCreatedBy()) && application.getCreatedBy().equalsIgnoreCase(approvedBy)) {
            throw new BusinessException("Approver must be different from the application creator", "FOUR_EYES_REQUIRED");
        }
        application.setApprovedBy(approvedBy);
        application.setApprovedAt(Instant.now());
        application.setStatus(IjarahDomainEnums.ApplicationStatus.APPROVED);
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application), List.of());
    }

    public IjarahResponses.IjarahApplicationResponse rejectApplication(Long applicationId, String reason) {
        IjarahApplication application = getApplicationEntity(applicationId);
        application.setStatus(IjarahDomainEnums.ApplicationStatus.REJECTED);
        application.setRejectionReason(reason);
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application), List.of());
    }

    public IjarahContract convertToContract(Long applicationId) {
        IjarahApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != IjarahDomainEnums.ApplicationStatus.APPROVED) {
            throw new BusinessException("Ijarah application must be approved before conversion", "INVALID_APPLICATION_STATUS");
        }

        IslamicProductTemplate product = resolveActiveIjarahProduct(application.getProductCode());
        int totalPeriods = IjarahSupport.totalPeriods(application.getRequestedTenorMonths(), application.getProposedRentalFrequency());
        BigDecimal totalExpected = IjarahSupport.money(
                IjarahSupport.nvl(application.getProposedRentalAmount()).multiply(BigDecimal.valueOf(totalPeriods)));

        IjarahContract contract = IjarahContract.builder()
                .contractRef(IjarahSupport.nextReference("IJR-FIN", CONTRACT_SEQUENCE))
                .applicationId(application.getId())
                .customerId(application.getCustomerId())
                .islamicProductTemplateId(product.getId())
                .productCode(product.getProductCode())
                .contractTypeCode("IJARAH")
                .ijarahType(application.getIjarahType())
                .assetDescription(application.getRequestedAssetDescription())
                .assetCategory(application.getRequestedAssetCategory())
                .assetAcquisitionCost(application.getEstimatedAssetCost())
                .assetResidualValue(BigDecimal.ZERO)
                .currencyCode(application.getCurrencyCode())
                .tenorMonths(application.getRequestedTenorMonths())
                .totalLeasePeriods(totalPeriods)
                .rentalFrequency(application.getProposedRentalFrequency())
                .baseRentalAmount(application.getProposedRentalAmount())
                .rentalType(IjarahDomainEnums.RentalType.FIXED)
                .rentalReviewFrequency(IjarahDomainEnums.RentalReviewFrequency.NONE)
                .advanceRentals(application.getProposedAdvanceRentals())
                .securityDeposit(application.getProposedSecurityDeposit())
                .totalRentalsExpected(totalExpected)
                .totalRentalsReceived(IjarahSupport.ZERO)
                .totalRentalArrears(IjarahSupport.ZERO)
                .assetOwnedByBank(false)
                .insuranceResponsibility(IjarahDomainEnums.InsuranceResponsibility.BANK)
                .majorMaintenanceResponsibility(IjarahDomainEnums.MajorMaintenanceResponsibility.BANK)
                .minorMaintenanceResponsibility(IjarahDomainEnums.MinorMaintenanceResponsibility.CUSTOMER)
                .gracePeriodDays(product.getGracePeriodDays() != null ? product.getGracePeriodDays() : 0)
                .latePenaltyApplicable(true)
                .latePenaltyToCharity(Boolean.TRUE.equals(product.getLatePenaltyToCharity()))
                .totalLatePenalties(IjarahSupport.ZERO)
                .totalCharityFromLatePenalties(IjarahSupport.ZERO)
                .imbTransferType(application.getIjarahType() == IjarahDomainEnums.IjarahType.IJARAH_MUNTAHIA_BITTAMLEEK
                        ? IjarahDomainEnums.TransferType.GIFT_HIBAH
                        : null)
                .imbTransferScheduled(false)
                .imbTransferCompleted(false)
                .status(IjarahDomainEnums.ContractStatus.DRAFT)
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();

        contract = contractRepository.save(contract);
        application.setContractId(contract.getId());
        application.setStatus(IjarahDomainEnums.ApplicationStatus.CONVERTED);
        applicationRepository.save(application);
        return contract;
    }

    private IjarahApplication getApplicationEntity(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahApplication", "id", applicationId));
    }

    private Customer getActiveCustomer(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Customer must be ACTIVE for Ijarah origination", "CUSTOMER_NOT_ACTIVE");
        }
        return customer;
    }

    private void ensureKycVerified(Long customerId) {
        if (customerIdentificationRepository.findVerifiedByCustomerId(customerId).isEmpty()) {
            throw new BusinessException("Customer must have at least one verified identification for Ijarah",
                    "KYC_NOT_VERIFIED");
        }
    }

    private IslamicProductTemplate resolveActiveIjarahProduct(String productCode) {
        IslamicProductTemplate product = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        if (product.getContractType() == null || !"IJARAH".equalsIgnoreCase(product.getContractType().getCode())) {
            throw new BusinessException("Product is not configured for Ijarah", "INVALID_PRODUCT_CONTRACT_TYPE");
        }
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            throw new BusinessException("Ijarah product is not ACTIVE", "PRODUCT_INACTIVE");
        }
        if (product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT) {
            throw new BusinessException("Ijarah product is not Shariah compliant", "PRODUCT_NOT_COMPLIANT");
        }
        return product;
    }

    private void validateAmountAndTenor(IslamicProductTemplate product, BigDecimal assetCost, Integer tenorMonths) {
        BigDecimal amount = IjarahSupport.money(assetCost);
        if (amount.compareTo(product.getMinAmount()) < 0
                || (product.getMaxAmount() != null && amount.compareTo(product.getMaxAmount()) > 0)) {
            throw new BusinessException("Ijarah amount is outside configured product bounds", "INVALID_IJARAH_AMOUNT");
        }
        if (tenorMonths < product.getMinTenorMonths() || tenorMonths > product.getMaxTenorMonths()) {
            throw new BusinessException("Ijarah tenor is outside configured product bounds", "INVALID_IJARAH_TENOR");
        }
    }

    private void ensureModifiable(IjarahApplication application) {
        if (application.getStatus() == IjarahDomainEnums.ApplicationStatus.APPROVED
                || application.getStatus() == IjarahDomainEnums.ApplicationStatus.REJECTED
                || application.getStatus() == IjarahDomainEnums.ApplicationStatus.CANCELLED
                || application.getStatus() == IjarahDomainEnums.ApplicationStatus.CONVERTED) {
            throw new BusinessException("Ijarah application can no longer be modified", "IMMUTABLE_APPLICATION");
        }
    }

    private BigDecimal calculateDsr(BigDecimal monthlyIncome, BigDecimal existingObligations, BigDecimal proposedRental) {
        BigDecimal income = IjarahSupport.money(monthlyIncome);
        if (income.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        BigDecimal numerator = IjarahSupport.money(existingObligations).add(IjarahSupport.money(proposedRental));
        return numerator.multiply(IjarahSupport.HUNDRED).divide(income, 4, RoundingMode.HALF_UP);
    }

    private List<String> buildDsrWarnings(BigDecimal dsr, BigDecimal dsrLimit) {
        List<String> warnings = new ArrayList<>();
        if (dsr.compareTo(dsrLimit) > 0) {
            warnings.add("DSR exceeds configured threshold of " + dsrLimit.toPlainString() + "%");
        }
        return warnings;
    }
}
