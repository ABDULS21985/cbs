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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IjarahOriginationService {

    private static final AtomicLong APPLICATION_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);
    private static final AtomicLong CONTRACT_SEQUENCE = new AtomicLong((System.currentTimeMillis() + 4000L) % 100000);

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
        resolveActiveIjarahProduct(request.getProductCode());
        productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        IjarahApplication application = IjarahApplication.builder()
                .applicationRef(IjarahSupport.nextReference("IJR-APP", APPLICATION_SEQUENCE))
                .customerId(request.getCustomerId())
                .productCode(request.getProductCode())
                .ijarahType(request.getIjarahType())
                .requestedAssetDescription(request.getRequestedAssetDescription())
                .requestedAssetCategory(request.getRequestedAssetCategory())
                .estimatedAssetCost(IjarahSupport.money(request.getEstimatedAssetCost()))
                .requestedTenorMonths(request.getRequestedTenorMonths())
                .currencyCode(request.getCurrencyCode())
                .purpose(request.getPurpose())
                .monthlyIncome(IjarahSupport.money(request.getMonthlyIncome()))
                .existingObligations(IjarahSupport.money(request.getExistingObligations()))
                .status(IjarahDomainEnums.ApplicationStatus.DRAFT)
                .branchId(request.getBranchId())
                .expiresAt(Instant.now().plusSeconds(30L * 24 * 60 * 60))
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahApplicationResponse getApplication(Long applicationId) {
        return IjarahSupport.toApplicationResponse(getApplicationEntity(applicationId));
    }

    public IjarahResponses.IjarahApplicationResponse submitApplication(Long applicationId) {
        IjarahApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != IjarahDomainEnums.ApplicationStatus.DRAFT) {
            throw new BusinessException("Only draft Ijarah applications can be submitted", "INVALID_APPLICATION_STATUS");
        }
        application.setStatus(IjarahDomainEnums.ApplicationStatus.SUBMITTED);
        application.setSubmittedAt(Instant.now());
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application));
    }

    public IjarahResponses.IjarahApplicationResponse performCreditAssessment(Long applicationId,
                                                                             IjarahRequests.CreditAssessmentRequest request) {
        IjarahApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);
        BigDecimal income = IjarahSupport.money(request.getMonthlyIncome());
        BigDecimal obligations = IjarahSupport.money(request.getExistingObligations());
        BigDecimal proposedRental = IjarahSupport.money(request.getProposedMonthlyRental() != null
                ? request.getProposedMonthlyRental()
                : Optional.ofNullable(application.getProposedRentalAmount()).orElse(BigDecimal.ZERO));
        BigDecimal dsr = calculateDsr(income, obligations, proposedRental);

        application.setMonthlyIncome(income);
        application.setExistingObligations(obligations);
        application.setProposedMonthlyRental(proposedRental);
        application.setDsrWithProposedRental(dsr);
        application.setCreditScore(request.getCreditScore());
        application.setAssignedOfficerId(request.getAssignedOfficerId());
        application.setStatus(IjarahDomainEnums.ApplicationStatus.CREDIT_ASSESSMENT);
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application));
    }

    public IjarahResponses.IjarahApplicationResponse priceApplication(Long applicationId,
                                                                      IjarahRequests.IjarahPricingRequest request) {
        IjarahApplication application = getApplicationEntity(applicationId);
        ensureModifiable(application);
        IslamicProductTemplate product = resolveActiveIjarahProduct(application.getProductCode());
        validateAmountBand(product, request.getAssetCost());
        validateTenor(product, request.getTenorMonths());

        int totalPeriods = IjarahSupport.periodsForTenor(request.getTenorMonths(), request.getRentalFrequency());
        BigDecimal periodicRental = IjarahSupport.calculateRental(
                request.getAssetCost(),
                request.getResidualValue(),
                request.getTargetProfit(),
                totalPeriods);

        application.setEstimatedAssetCost(IjarahSupport.money(request.getAssetCost()));
        application.setRequestedTenorMonths(request.getTenorMonths());
        application.setProposedRentalAmount(periodicRental);
        application.setProposedRentalFrequency(request.getRentalFrequency());
        application.setProposedAdvanceRentals(request.getAdvanceRentals() == null ? 0 : request.getAdvanceRentals());
        application.setProposedSecurityDeposit(IjarahSupport.money(request.getSecurityDeposit()));
        application.setStatus(IjarahDomainEnums.ApplicationStatus.PRICING);
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application));
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
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application));
    }

    public IjarahResponses.IjarahApplicationResponse rejectApplication(Long applicationId, String reason) {
        IjarahApplication application = getApplicationEntity(applicationId);
        ensureNotTerminal(application);
        application.setStatus(IjarahDomainEnums.ApplicationStatus.REJECTED);
        application.setRejectionReason(reason);
        return IjarahSupport.toApplicationResponse(applicationRepository.save(application));
    }

    public IjarahContract convertToContract(Long applicationId) {
        IjarahApplication application = getApplicationEntity(applicationId);
        if (application.getStatus() != IjarahDomainEnums.ApplicationStatus.APPROVED) {
            throw new BusinessException("Only approved Ijarah applications can be converted", "APPLICATION_NOT_APPROVED");
        }
        IslamicProductTemplate product = resolveActiveIjarahProduct(application.getProductCode());
        int tenorMonths = application.getRequestedTenorMonths();
        IjarahDomainEnums.RentalFrequency frequency = application.getProposedRentalFrequency() == null
                ? IjarahDomainEnums.RentalFrequency.MONTHLY
                : application.getProposedRentalFrequency();
        int periods = IjarahSupport.periodsForTenor(tenorMonths, frequency);
        BigDecimal rentalAmount = IjarahSupport.money(application.getProposedRentalAmount());
        BigDecimal totalRentals = IjarahSupport.money(rentalAmount.multiply(BigDecimal.valueOf(periods)));
        BigDecimal bankReturn = application.getEstimatedAssetCost() == null
                || application.getEstimatedAssetCost().compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP)
                : totalRentals.divide(application.getEstimatedAssetCost(), 8, RoundingMode.HALF_UP)
                .multiply(IjarahSupport.HUNDRED)
                .setScale(4, RoundingMode.HALF_UP);

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
                .assetAcquisitionCost(IjarahSupport.money(application.getEstimatedAssetCost()))
                .assetResidualValue(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .currencyCode(application.getCurrencyCode())
                .tenorMonths(tenorMonths)
                .totalLeasePeriods(periods)
                .rentalFrequency(frequency)
                .baseRentalAmount(rentalAmount)
                .rentalType(IjarahDomainEnums.RentalType.FIXED)
                .rentalReviewFrequency(product.getRentalReviewFrequency() == null
                        ? "NONE"
                        : product.getRentalReviewFrequency().name())
                .advanceRentals(application.getProposedAdvanceRentals() == null ? 0 : application.getProposedAdvanceRentals())
                .securityDeposit(IjarahSupport.money(application.getProposedSecurityDeposit()))
                .totalRentalsExpected(totalRentals)
                .bankReturnOnAsset(bankReturn)
                .assetOwnedByBank(Boolean.FALSE)
                .insuranceResponsibility(IjarahDomainEnums.InsuranceResponsibility.BANK)
                .majorMaintenanceResponsibility(IjarahDomainEnums.MajorMaintenanceResponsibility.BANK)
                .minorMaintenanceResponsibility(IjarahDomainEnums.MinorMaintenanceResponsibility.CUSTOMER)
                .gracePeriodDays(product.getGracePeriodDays() == null ? 0 : product.getGracePeriodDays())
                .latePenaltyApplicable(Boolean.TRUE.equals(product.getLatePenaltyToCharity()))
                .latePenaltyToCharity(Boolean.TRUE.equals(product.getLatePenaltyToCharity()))
                .imbTransferType(Boolean.TRUE.equals(product.getAssetTransferOnCompletion())
                        ? IjarahDomainEnums.TransferType.GIFT_HIBAH : null)
                .status(IjarahDomainEnums.ContractStatus.DRAFT)
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();
        contract = contractRepository.save(contract);

        application.setContractId(contract.getId());
        application.setStatus(IjarahDomainEnums.ApplicationStatus.CONVERTED);
        applicationRepository.save(application);
        return contract;
    }

    private BigDecimal calculateDsr(BigDecimal income, BigDecimal obligations, BigDecimal rental) {
        BigDecimal safeIncome = IjarahSupport.money(income);
        if (safeIncome.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return IjarahSupport.money(IjarahSupport.money(obligations).add(IjarahSupport.money(rental)))
                .divide(safeIncome, 8, RoundingMode.HALF_UP)
                .multiply(IjarahSupport.HUNDRED)
                .setScale(4, RoundingMode.HALF_UP);
    }

    private Customer getActiveCustomer(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Customer is not active", "CUSTOMER_NOT_ACTIVE");
        }
        return customer;
    }

    private void ensureKycVerified(Long customerId) {
        if (customerIdentificationRepository.findVerifiedByCustomerId(customerId).isEmpty()) {
            throw new BusinessException("Customer KYC must be verified before Ijarah origination", "KYC_NOT_VERIFIED");
        }
    }

    private IslamicProductTemplate resolveActiveIjarahProduct(String productCode) {
        IslamicProductTemplate product = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            throw new BusinessException("Ijarah product is not active", "PRODUCT_INACTIVE");
        }
        if (product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT) {
            throw new BusinessException("Ijarah product is not Shariah compliant", "PRODUCT_NON_COMPLIANT");
        }
        if (product.getContractType() == null || !"IJARAH".equalsIgnoreCase(product.getContractType().getCode())) {
            throw new BusinessException("Selected product is not an Ijarah product", "INVALID_PRODUCT_CONTRACT");
        }
        if (Boolean.TRUE.equals(product.getFatwaRequired()) && product.getActiveFatwaId() == null) {
            throw new BusinessException("Ijarah product requires an active fatwa", "FATWA_REQUIRED");
        }
        return product;
    }

    private void validateAmountBand(IslamicProductTemplate product, BigDecimal amount) {
        BigDecimal requested = IjarahSupport.money(amount);
        if (requested.compareTo(product.getMinAmount()) < 0) {
            throw new BusinessException("Requested amount is below product minimum", "AMOUNT_BELOW_MINIMUM");
        }
        if (product.getMaxAmount() != null && requested.compareTo(product.getMaxAmount()) > 0) {
            throw new BusinessException("Requested amount exceeds product maximum", "AMOUNT_ABOVE_MAXIMUM");
        }
    }

    private void validateTenor(IslamicProductTemplate product, Integer tenorMonths) {
        if (tenorMonths == null || tenorMonths < product.getMinTenorMonths()) {
            throw new BusinessException("Requested tenor is below product minimum", "TENOR_BELOW_MINIMUM");
        }
        if (product.getMaxTenorMonths() != null && tenorMonths > product.getMaxTenorMonths()) {
            throw new BusinessException("Requested tenor exceeds product maximum", "TENOR_ABOVE_MAXIMUM");
        }
    }

    private IjarahApplication getApplicationEntity(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahApplication", "id", applicationId));
    }

    private void ensureModifiable(IjarahApplication application) {
        if (application.getStatus() == IjarahDomainEnums.ApplicationStatus.REJECTED
                || application.getStatus() == IjarahDomainEnums.ApplicationStatus.CANCELLED
                || application.getStatus() == IjarahDomainEnums.ApplicationStatus.CONVERTED
                || application.getStatus() == IjarahDomainEnums.ApplicationStatus.EXPIRED) {
            throw new BusinessException("Ijarah application can no longer be modified", "INVALID_APPLICATION_STATUS");
        }
    }

    private void ensureNotTerminal(IjarahApplication application) {
        if (application.getStatus() == IjarahDomainEnums.ApplicationStatus.CONVERTED
                || application.getStatus() == IjarahDomainEnums.ApplicationStatus.EXPIRED) {
            throw new BusinessException("Ijarah application is already terminal", "INVALID_APPLICATION_STATUS");
        }
    }
}
