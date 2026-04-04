package com.cbs.ijarah.service;

import com.cbs.account.dto.OpenAccountRequest;
import com.cbs.account.entity.AccountType;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.profitdistribution.dto.AssignAssetToPoolRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IjarahContractService {

    private final IjarahContractRepository contractRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final AccountService accountService;
    private final IjarahAssetService assetService;
    private final IjarahRentalService rentalService;
    private final IjarahTransferService transferService;
    private final IslamicPostingRuleService postingRuleService;
    private final PoolAssetManagementService poolAssetManagementService;
    private final ShariahScreeningService shariahScreeningService;

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahContractResponse getContract(Long contractId) {
        return IjarahSupport.toContractResponse(findContract(contractId));
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahContractResponse getContractByRef(String ref) {
        return IjarahSupport.toContractResponse(contractRepository.findByContractRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "contractRef", ref)));
    }

    @Transactional(readOnly = true)
    public List<IjarahResponses.IjarahContractResponse> getCustomerContracts(Long customerId) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        return contractRepository.findByCustomerId(customerId).stream()
                .map(IjarahSupport::toContractResponse)
                .toList();
    }

    public IjarahResponses.IjarahContractResponse initiateAssetProcurement(Long contractId, IjarahRequests.AssetProcurementRequest request) {
        IjarahContract contract = findContract(contractId);
        contract.setAssetAcquisitionCost(IjarahSupport.money(request.getAcquisitionCost()));
        contract.setAssetDescription(StringUtils.hasText(contract.getAssetDescription())
                ? contract.getAssetDescription()
                : request.getAssetDescription());
        contract.setStatus(IjarahDomainEnums.ContractStatus.ASSET_PROCUREMENT);
        contractRepository.save(contract);
        return IjarahSupport.toContractResponse(contract);
    }

    public IjarahResponses.IjarahContractResponse confirmAssetOwnership(Long contractId,
                                                                  IjarahRequests.AssetOwnershipConfirmationRequest request) {
        IjarahContract contract = findContract(contractId);
        if (!StringUtils.hasText(request.getRegisteredOwner())) {
            throw new BusinessException("Ijarah asset must be registered in the bank's name", "IJARAH_ASSET_NOT_REGISTERED");
        }

        var asset = assetService.registerAsset(IjarahRequests.RegisterAssetRequest.builder()
                .contractId(contract.getId())
                .assetCategory(contract.getAssetCategory())
                .assetDescription(contract.getAssetDescription())
                .acquisitionDate(request.getAcquisitionDate() != null ? request.getAcquisitionDate() : LocalDate.now())
                .acquisitionCost(contract.getAssetAcquisitionCost())
                .supplierName(request.getSupplierName())
                .supplierInvoiceRef(request.getSupplierInvoiceRef())
                .currencyCode(contract.getCurrencyCode())
                .usefulLifeMonths(request.getUsefulLifeMonths())
                .residualValue(request.getResidualValue())
                .depreciationMethod(request.getDepreciationMethod())
                .registeredOwner(request.getRegisteredOwner())
                .ownershipEvidenceRef(request.getOwnershipEvidenceRef())
                .build());

        if (StringUtils.hasText(request.getInsurancePolicyRef())) {
            assetService.updateInsurance(asset.getId(), IjarahRequests.InsuranceUpdateRequest.builder()
                    .insured(true)
                    .insurancePolicyRef(request.getInsurancePolicyRef())
                    .insuranceProvider(request.getInsuranceProvider())
                    .insuranceCoverageAmount(request.getInsuranceCoverageAmount())
                    .insuranceExpiryDate(request.getInsuranceExpiryDate())
                    .build());
        }

        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.ASSET_ACQUISITION)
                .amount(IjarahSupport.money(contract.getAssetAcquisitionCost()))
                .valueDate(LocalDate.now())
                .reference(contract.getContractRef() + "-ACQ")
                .build());

        contract.setIjarahAssetId(asset.getId());
        contract.setAssetOwnedByBank(true);
        contract.setInsurancePolicyRef(request.getInsurancePolicyRef());
        contract.setInsuranceProvider(request.getInsuranceProvider());
        contract.setInsuranceCoverageAmount(IjarahSupport.money(request.getInsuranceCoverageAmount()));
        contract.setInsuranceExpiryDate(request.getInsuranceExpiryDate());
        contract.setStatus(IjarahDomainEnums.ContractStatus.ASSET_OWNED);
        contractRepository.save(contract);

        return IjarahSupport.toContractResponse(contract);
    }

    public IjarahResponses.IjarahContractResponse executeContract(Long contractId, String executedBy) {
        IjarahContract contract = findContract(contractId);
        if (!Boolean.TRUE.equals(contract.getAssetOwnedByBank()) || contract.getIjarahAssetId() == null) {
            throw new BusinessException("Bank must own the asset before lease execution", "SHARIAH-IJR-001");
        }
        if (contract.getInsuranceExpiryDate() == null || contract.getInsuranceExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessException("Insurance must be in place before lease execution", "MISSING_IJARAH_INSURANCE");
        }
        IslamicProductTemplate product = islamicProductTemplateRepository.findById(contract.getIslamicProductTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "id", contract.getIslamicProductTemplateId()));
        if (Boolean.TRUE.equals(product.getFatwaRequired()) && product.getActiveFatwaId() == null) {
            throw new BusinessException("Ijarah product requires an active fatwa before execution", "PRODUCT_FATWA_REQUIRED");
        }
        if (contract.getIjarahType() == IjarahDomainEnums.IjarahType.IJARAH_MUNTAHIA_BITTAMLEEK
                && contract.getImbTransferMechanismId() == null) {
            throw new BusinessException("IMB requires a separate transfer mechanism before execution", "SHARIAH-IJR-004");
        }
        if (contract.getAccountId() == null) {
            contract.setAccountId(openFinancingAccount(contract));
        }
        if (rentalService.getSchedule(contractId).isEmpty()) {
            contract.setLeaseStartDate(contract.getLeaseStartDate() != null ? contract.getLeaseStartDate() : LocalDate.now());
            contract.setLeaseEndDate(contract.getLeaseStartDate().plusMonths(contract.getTenorMonths()));
            rentalService.generateRentalSchedule(contractId);
        }

        boolean separateTransferDocument = true;
        if (contract.getImbTransferMechanismId() != null) {
            separateTransferDocument = transferService.getTransferMechanism(contract.getImbTransferMechanismId()).getIsSeparateDocument();
        }
        var screening = shariahScreeningService.screenPreExecution(ShariahScreeningRequest.builder()
                .transactionRef(contract.getContractRef() + "-EXEC")
                .transactionType("IJARAH_EXECUTION")
                .amount(contract.getAssetAcquisitionCost())
                .currencyCode(contract.getCurrencyCode())
                .contractRef(contract.getContractRef())
                .contractTypeCode("IJARAH")
                .customerId(contract.getCustomerId())
                .additionalContext(Map.of(
                        "assetOwnedByBank", contract.getAssetOwnedByBank(),
                        "majorMaintenanceResponsibility", contract.getMajorMaintenanceResponsibility().name(),
                        "insuranceInPlace", contract.getInsuranceExpiryDate() != null && !contract.getInsuranceExpiryDate().isBefore(LocalDate.now()),
                        "ijarahType", contract.getIjarahType().name(),
                        "separateTransferDocument", separateTransferDocument,
                        "reviewRequested", false,
                        "reviewDateAgreed", true,
                        "productCompliant", product.getActiveFatwaId() != null || !Boolean.TRUE.equals(product.getFatwaRequired())))
                .build());
        shariahScreeningService.ensureAllowed(screening);

        if (contract.getInvestmentPoolId() != null && contract.getPoolAssetAssignmentId() == null) {
            var assignment = poolAssetManagementService.assignAssetToPool(
                    contract.getInvestmentPoolId(),
                    AssignAssetToPoolRequest.builder()
                            .poolId(contract.getInvestmentPoolId())
                            .assetType("IJARAH_CONTRACT")
                            .assetReferenceId(contract.getId())
                            .assetReferenceCode(contract.getContractRef())
                            .assetDescription(contract.getAssetDescription())
                            .assignedAmount(contract.getAssetAcquisitionCost())
                            .currentOutstanding(contract.getAssetAcquisitionCost())
                            .currencyCode(contract.getCurrencyCode())
                            .contractTypeCode("IJARAH")
                            .maturityDate(contract.getLeaseEndDate())
                            .build());
            contract.setPoolAssetAssignmentId(assignment.getId());
        }

        var asset = assetService.findAsset(contract.getIjarahAssetId());
        asset.setStatus(IjarahDomainEnums.AssetStatus.LEASED);
        contract.setExecutedAt(Instant.now());
        contract.setExecutedBy(executedBy);
        contract.setStatus(IjarahDomainEnums.ContractStatus.ACTIVE);
        contract.setLastScreeningRef(screening.getScreeningRef());
        contractRepository.save(contract);
        return IjarahSupport.toContractResponse(contract);
    }

    public void recordAssetDamage(Long contractId, IjarahRequests.AssetDamageReportRequest request) {
        if (request.isTotalLoss()) {
            recordAssetTotalLoss(contractId, IjarahRequests.AssetTotalLossRequest.builder()
                    .lossDate(request.getEventDate() != null ? request.getEventDate() : LocalDate.now())
                    .reason(request.getDescription())
                    .insuranceRecovery(BigDecimal.ZERO)
                    .build());
            return;
        }
        if (request.isMajorDamage()) {
            recordMajorMaintenance(contractId, IjarahRequests.MaintenanceRecordRequest.builder()
                    .maintenanceType(IjarahDomainEnums.MaintenanceType.EMERGENCY_REPAIR)
                    .responsibleParty(IjarahDomainEnums.ResponsibleParty.BANK)
                    .description(request.getDescription())
                    .cost(request.getEstimatedCost() != null ? request.getEstimatedCost() : BigDecimal.ZERO)
                    .currencyCode("SAR")
                    .maintenanceDate(request.getEventDate() != null ? request.getEventDate() : LocalDate.now())
                    .completionDate(request.getEventDate() != null ? request.getEventDate() : LocalDate.now())
                    .build());
        }
    }

    public void recordAssetTotalLoss(Long contractId, IjarahRequests.AssetTotalLossRequest request) {
        IjarahContract contract = findContract(contractId);
        var asset = assetService.findAsset(contract.getIjarahAssetId());
        BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
        BigDecimal insuranceRecovery = IjarahSupport.money(request.getInsuranceRecovery());

        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.CONTRACT_CANCELLATION)
                .amount(nbv.max(BigDecimal.ONE))
                .reference(contract.getContractRef() + "-LOSS")
                .valueDate(request.getLossDate() != null ? request.getLossDate() : LocalDate.now())
                .additionalContext(Map.of(
                        "lossEvent", true,
                        "assetCost", IjarahSupport.money(asset.getAcquisitionCost()),
                        "accumulatedDepreciation", IjarahSupport.money(asset.getAccumulatedDepreciation()),
                        "netBookValue", nbv,
                        "insuranceRecovery", insuranceRecovery))
                .build());

        rentalService.getSchedule(contractId).stream()
                .filter(installment -> installment.getDueDate().isAfter(request.getLossDate()))
                .forEach(installment -> {
                    installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.CANCELLED);
                });

        asset.setStatus(IjarahDomainEnums.AssetStatus.TOTAL_LOSS);
        contract.setStatus(IjarahDomainEnums.ContractStatus.TERMINATED_ASSET_LOSS);
        contract.setTerminatedAt(request.getLossDate());
        contract.setTerminationReason(request.getReason());
        if (contract.getImbTransferMechanismId() != null) {
            transferService.voidTransfer(contract.getImbTransferMechanismId(), request.getReason());
        }
        if (contract.getPoolAssetAssignmentId() != null) {
            poolAssetManagementService.unassignAssetFromPool(contract.getPoolAssetAssignmentId(), "IJARAH_TOTAL_LOSS");
        }
        contractRepository.save(contract);
    }

    public void processInsuranceRenewal(Long contractId, IjarahRequests.InsuranceRenewalRequest request) {
        IjarahContract contract = findContract(contractId);
        contract.setInsurancePolicyRef(request.getInsurancePolicyRef());
        contract.setInsuranceProvider(request.getInsuranceProvider());
        contract.setInsuranceCoverageAmount(IjarahSupport.money(request.getCoverageAmount()));
        contract.setInsuranceExpiryDate(request.getExpiryDate());
        contractRepository.save(contract);
        assetService.updateInsurance(contract.getIjarahAssetId(), IjarahRequests.InsuranceUpdateRequest.builder()
                .insured(true)
                .insurancePolicyRef(request.getInsurancePolicyRef())
                .insuranceProvider(request.getInsuranceProvider())
                .insuranceCoverageAmount(request.getCoverageAmount())
                .insurancePremiumAnnual(request.getPremiumAmount())
                .insuranceExpiryDate(request.getExpiryDate())
                .build());
    }

    public void recordMajorMaintenance(Long contractId, IjarahRequests.MaintenanceRecordRequest request) {
        IjarahContract contract = findContract(contractId);
        if (request.getResponsibleParty() != IjarahDomainEnums.ResponsibleParty.BANK) {
            throw new BusinessException("Major maintenance must remain the bank's responsibility", "SHARIAH-IJR-002");
        }
        assetService.recordMaintenance(contract.getIjarahAssetId(), request);
        contract.setLastMajorMaintenanceDate(request.getMaintenanceDate());
        contract.setNextMajorMaintenanceDueDate(request.getCompletionDate() != null
                ? request.getCompletionDate().plusMonths(12)
                : request.getMaintenanceDate().plusMonths(12));
        contractRepository.save(contract);
    }

    public IjarahResponses.IjarahContractResponse processLeaseMaturity(Long contractId) {
        IjarahContract contract = findContract(contractId);
        var asset = assetService.findAsset(contract.getIjarahAssetId());
        if (contract.getIjarahType() == IjarahDomainEnums.IjarahType.OPERATING_IJARAH) {
            asset.setStatus(IjarahDomainEnums.AssetStatus.RETURNED);
            contract.setStatus(IjarahDomainEnums.ContractStatus.CLOSED);
        } else {
            contract.setStatus(IjarahDomainEnums.ContractStatus.MATURED);
            if (contract.getImbTransferMechanismId() != null) {
                var mechanism = transferService.getTransferMechanism(contract.getImbTransferMechanismId());
                mechanism.setStatus(IjarahDomainEnums.TransferStatus.PENDING_EXECUTION);
            }
        }
        contractRepository.save(contract);
        return IjarahSupport.toContractResponse(contract);
    }

    public IjarahResponses.IjarahContractResponse processEarlyTermination(Long contractId, IjarahRequests.EarlyTerminationRequest request) {
        IjarahContract contract = findContract(contractId);
        rentalService.getSchedule(contractId).stream()
                .filter(installment -> installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.SCHEDULED
                        || installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.DUE)
                .forEach(installment -> installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.CANCELLED));
        contract.setStatus(IjarahDomainEnums.ContractStatus.TERMINATED_EARLY);
        contract.setTerminatedAt(request.getTerminationDate() != null ? request.getTerminationDate() : LocalDate.now());
        contract.setTerminationReason(request.getReason());
        if (contract.getImbTransferMechanismId() != null) {
            transferService.cancelTransfer(contract.getImbTransferMechanismId(), request.getReason());
        }
        contractRepository.save(contract);
        return IjarahSupport.toContractResponse(contract);
    }

    public IjarahResponses.IjarahContractResponse reviewRental(Long contractId, IjarahRequests.RentalReviewRequest request) {
        IjarahContract contract = findContract(contractId);
        if (contract.getRentalReviewFrequency() == IjarahDomainEnums.RentalReviewFrequency.NONE) {
            throw new BusinessException("This Ijarah contract does not permit rental review", "RENTAL_REVIEW_NOT_ALLOWED");
        }
        rentalService.applyRentalReview(contractId, request.getNewRentalAmount(), request.getEffectiveDate());
        return IjarahSupport.toContractResponse(findContract(contractId));
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahPortfolioSummary getPortfolioSummary() {
        List<IjarahContract> contracts = contractRepository.findAll();
        return IjarahResponses.IjarahPortfolioSummary.builder()
                .totalContracts(contracts.size())
                .totalAssetsUnderIjarah(contracts.stream().map(c -> IjarahSupport.money(c.getAssetAcquisitionCost())).reduce(IjarahSupport.ZERO, BigDecimal::add))
                .rentalIncomeYtd(contracts.stream().map(c -> IjarahSupport.money(c.getTotalRentalsReceived())).reduce(IjarahSupport.ZERO, BigDecimal::add))
                .byType(contracts.stream().collect(java.util.stream.Collectors.groupingBy(c -> c.getIjarahType().name(), java.util.stream.Collectors.counting())))
                .byStatus(contracts.stream().collect(java.util.stream.Collectors.groupingBy(c -> c.getStatus().name(), java.util.stream.Collectors.counting())))
                .upcomingMaturities(contractRepository.findByLeaseEndDateBetween(LocalDate.now(), LocalDate.now().plusDays(30)).size())
                .build();
    }

    @Transactional(readOnly = true)
    public List<IjarahContract> getContractsWithExpiringInsurance(int daysAhead) {
        return contractRepository.findByInsuranceExpiryDateBefore(LocalDate.now().plusDays(daysAhead));
    }

    @Transactional(readOnly = true)
    public List<IjarahContract> getContractsWithUpcomingRentalReview(int daysAhead) {
        return contractRepository.findByNextRentalReviewDateBetween(LocalDate.now(), LocalDate.now().plusDays(daysAhead));
    }

    @Transactional(readOnly = true)
    public List<IjarahContract> getContractsInArrears() {
        return contractRepository.findAll().stream()
                .filter(contract -> IjarahSupport.money(contract.getTotalRentalArrears()).compareTo(BigDecimal.ZERO) > 0
                        || contract.getStatus() == IjarahDomainEnums.ContractStatus.RENTAL_ARREARS)
                .toList();
    }

    IjarahContract findContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
    }

    private Long openFinancingAccount(IjarahContract contract) {
        Customer customer = customerRepository.findById(contract.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", contract.getCustomerId()));
        IslamicProductTemplate productTemplate = islamicProductTemplateRepository.findById(contract.getIslamicProductTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "id", contract.getIslamicProductTemplateId()));
        productRepository.findByCode(productTemplate.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", productTemplate.getProductCode()));

        var accountResponse = accountService.openAccount(OpenAccountRequest.builder()
                .customerId(customer.getId())
                .productCode(productTemplate.getProductCode())
                .accountType(customer.isCorporate() ? AccountType.CORPORATE : AccountType.INDIVIDUAL)
                .accountName("Ijarah Financing - " + customer.getDisplayName())
                .currencyCode(contract.getCurrencyCode())
                .initialDeposit(BigDecimal.ZERO)
                .branchCode(StringUtils.hasText(customer.getBranchCode()) ? customer.getBranchCode() : "HQ")
                .statementFrequency("MONTHLY")
                .build());
        return accountResponse.getId();
    }
}
