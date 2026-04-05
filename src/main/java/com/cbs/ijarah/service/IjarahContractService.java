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
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
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
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IjarahContractService {

    private final IjarahContractRepository contractRepository;
    private final IjarahRentalInstallmentRepository installmentRepository;
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
        if (contract.getStatus() != IjarahDomainEnums.ContractStatus.DRAFT) {
            throw new BusinessException("Asset procurement can only be initiated for DRAFT contracts", "INVALID_CONTRACT_STATUS");
        }
        // Validate acquisition cost is positive
        if (request.getAcquisitionCost() == null || request.getAcquisitionCost().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Asset acquisition cost must be greater than zero", "INVALID_ACQUISITION_COST");
        }
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
        if (contract.getStatus() != IjarahDomainEnums.ContractStatus.ASSET_PROCUREMENT
                && contract.getStatus() != IjarahDomainEnums.ContractStatus.DRAFT) {
            throw new BusinessException("Asset ownership can only be confirmed when contract is in DRAFT or ASSET_PROCUREMENT status",
                    "INVALID_CONTRACT_STATUS");
        }
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
        // Four-eyes check: executor must be different from contract creator
        if (StringUtils.hasText(contract.getCreatedBy()) && contract.getCreatedBy().equalsIgnoreCase(executedBy)) {
            throw new BusinessException("Contract executor must be different from the contract creator (four-eyes principle)", "FOUR_EYES_REQUIRED");
        }
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
        validateImbTransferSeparation(contract);
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

    private void validateImbTransferSeparation(IjarahContract contract) {
        if (contract.getIjarahType() != IjarahDomainEnums.IjarahType.IJARAH_MUNTAHIA_BITTAMLEEK) {
            return;
        }
        if (contract.getImbTransferMechanismId() == null) {
            throw new BusinessException("IMB requires a separately documented transfer mechanism before execution", "SHARIAH-IJR-004");
        }

        var mechanism = transferService.getTransferMechanism(contract.getImbTransferMechanismId());
        if (!Objects.equals(mechanism.getIjarahContractId(), contract.getId())) {
            throw new BusinessException("IMB transfer mechanism must reference the same contract being executed", "SHARIAH-IJR-004");
        }
        if (!Boolean.TRUE.equals(mechanism.getIsSeparateDocument())) {
            throw new BusinessException("IMB transfer undertaking must remain a separate document from the lease", "SHARIAH-IJR-004");
        }
        if (!StringUtils.hasText(mechanism.getDocumentReference())
                || mechanism.getDocumentReference().equalsIgnoreCase(contract.getContractRef())) {
            throw new BusinessException("IMB transfer document reference must be distinct from the lease contract reference", "SHARIAH-IJR-004");
        }
        if (mechanism.getDocumentDate() == null || mechanism.getDocumentDate().isAfter(LocalDate.now())) {
            throw new BusinessException("IMB transfer document must be dated on or before execution", "SHARIAH-IJR-004");
        }
        if (!Boolean.TRUE.equals(mechanism.getSignedByBank()) || !Boolean.TRUE.equals(mechanism.getSignedByCustomer())) {
            throw new BusinessException("IMB transfer undertaking must be signed by both bank and customer before execution", "SHARIAH-IJR-004");
        }
        if (mechanism.getStatus() != IjarahDomainEnums.TransferStatus.ACTIVE) {
            throw new BusinessException("IMB transfer undertaking must be active before lease execution", "SHARIAH-IJR-004");
        }
        if (contract.getImbTransferType() != null && mechanism.getTransferType() != contract.getImbTransferType()) {
            throw new BusinessException("IMB transfer mechanism type must match the contract transfer type", "SHARIAH-IJR-004");
        }
        if (mechanism.getTransferType() == IjarahDomainEnums.TransferType.GRADUAL_TRANSFER) {
            if (mechanism.getTotalTransferUnits() == null || mechanism.getTotalTransferUnits() <= 0) {
                throw new BusinessException("Gradual IMB transfer must define total transfer units before execution", "SHARIAH-IJR-004");
            }
            if (mechanism.getUnitTransferAmount() == null || mechanism.getUnitTransferAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Gradual IMB transfer must define a positive unit transfer amount", "SHARIAH-IJR-004");
            }
        }
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
        IjarahContract contract = findContract(contractId);
        if (request.isMajorDamage()) {
            recordMajorMaintenance(contractId, IjarahRequests.MaintenanceRecordRequest.builder()
                    .maintenanceType(IjarahDomainEnums.MaintenanceType.EMERGENCY_REPAIR)
                    .responsibleParty(IjarahDomainEnums.ResponsibleParty.BANK)
                    .description(request.getDescription())
                    .cost(request.getEstimatedCost() != null ? request.getEstimatedCost() : BigDecimal.ZERO)
                    .currencyCode(contract.getCurrencyCode())
                    .maintenanceDate(request.getEventDate() != null ? request.getEventDate() : LocalDate.now())
                    .completionDate(request.getEventDate() != null ? request.getEventDate() : LocalDate.now())
                    .build());
        } else {
            // Minor damage: record on the asset for audit trail
            assetService.recordMaintenance(contract.getIjarahAssetId(), IjarahRequests.MaintenanceRecordRequest.builder()
                    .maintenanceType(IjarahDomainEnums.MaintenanceType.MINOR_REPAIR)
                    .responsibleParty(IjarahDomainEnums.ResponsibleParty.CUSTOMER)
                    .description("Minor damage: " + request.getDescription())
                    .cost(request.getEstimatedCost() != null ? request.getEstimatedCost() : BigDecimal.ZERO)
                    .currencyCode(contract.getCurrencyCode())
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

        List<IjarahRentalInstallment> cancelledInstallments = rentalService.getSchedule(contractId).stream()
                .filter(installment -> installment.getDueDate().isAfter(request.getLossDate()))
                .peek(installment -> installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.CANCELLED))
                .collect(Collectors.toList());
        installmentRepository.saveAll(cancelledInstallments);

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
        // Guard against double-maturity processing
        if (contract.getStatus() == IjarahDomainEnums.ContractStatus.CLOSED
                || contract.getStatus() == IjarahDomainEnums.ContractStatus.MATURED) {
            throw new BusinessException("Contract is already " + contract.getStatus() + " and cannot be matured again",
                    "INVALID_CONTRACT_STATUS");
        }
        var asset = assetService.findAsset(contract.getIjarahAssetId());

        // Check all rentals are paid before maturity processing
        boolean hasUnpaidRentals = rentalService.getSchedule(contractId).stream()
                .anyMatch(installment -> installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.PAID
                        && installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.WAIVED
                        && installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.CANCELLED);
        if (hasUnpaidRentals) {
            throw new BusinessException("All rental obligations must be settled before lease maturity processing", "OUTSTANDING_RENTALS");
        }

        // Post final GL entries for maturity
        BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.CONTRACT_CANCELLATION)
                .amount(nbv.max(BigDecimal.ONE))
                .reference(contract.getContractRef() + "-MATURITY")
                .valueDate(LocalDate.now())
                .additionalContext(Map.of(
                        "maturityEvent", true,
                        "assetCost", IjarahSupport.money(asset.getAcquisitionCost()),
                        "accumulatedDepreciation", IjarahSupport.money(asset.getAccumulatedDepreciation()),
                        "netBookValue", nbv))
                .build());

        // Handle security deposit return
        if (contract.getSecurityDeposit() != null && contract.getSecurityDeposit().compareTo(BigDecimal.ZERO) > 0) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.RENTAL_PAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(IjarahSupport.money(contract.getSecurityDeposit()))
                    .reference(contract.getContractRef() + "-DEPOSIT-RETURN")
                    .valueDate(LocalDate.now())
                    .narration("Security deposit return on lease maturity")
                    .additionalContext(Map.of("depositReturn", true))
                    .build());
        }

        if (contract.getIjarahType() == IjarahDomainEnums.IjarahType.OPERATING_IJARAH) {
            asset.setStatus(IjarahDomainEnums.AssetStatus.RETURNED);
            contract.setStatus(IjarahDomainEnums.ContractStatus.CLOSED);
        } else {
            contract.setStatus(IjarahDomainEnums.ContractStatus.MATURED);
            if (contract.getImbTransferMechanismId() != null) {
                var mechanism = transferService.getTransferMechanism(contract.getImbTransferMechanismId());
                mechanism.setStatus(IjarahDomainEnums.TransferStatus.PENDING_EXECUTION);
                transferService.saveTransferMechanism(mechanism);
            }
        }
        contractRepository.save(contract);
        return IjarahSupport.toContractResponse(contract);
    }

    public IjarahResponses.IjarahContractResponse processEarlyTermination(Long contractId, IjarahRequests.EarlyTerminationRequest request) {
        IjarahContract contract = findContract(contractId);
        LocalDate terminationDate = request.getTerminationDate() != null ? request.getTerminationDate() : LocalDate.now();

        List<IjarahRentalInstallment> cancelledInstallments = rentalService.getSchedule(contractId).stream()
                .filter(installment -> installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.SCHEDULED
                        || installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.DUE)
                .peek(installment -> installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.CANCELLED))
                .collect(Collectors.toList());
        installmentRepository.saveAll(cancelledInstallments);

        // GL posting for early termination accounting
        BigDecimal negotiatedAmount = IjarahSupport.money(request.getNegotiatedPurchaseAmount());
        if (contract.getIjarahAssetId() != null) {
            var asset = assetService.findAsset(contract.getIjarahAssetId());
            BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
            BigDecimal postingAmount = negotiatedAmount.compareTo(BigDecimal.ZERO) > 0 ? negotiatedAmount : nbv;
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.CONTRACT_CANCELLATION)
                    .amount(postingAmount.max(BigDecimal.ONE))
                    .reference(contract.getContractRef() + "-EARLY-TERM")
                    .valueDate(terminationDate)
                    .additionalContext(Map.of(
                            "terminationReason", request.getReason() != null ? request.getReason() : "EARLY_TERMINATION",
                            "assetCost", IjarahSupport.money(asset.getAcquisitionCost()),
                            "accumulatedDepreciation", IjarahSupport.money(asset.getAccumulatedDepreciation()),
                            "netBookValue", nbv,
                            "negotiatedPurchaseAmount", negotiatedAmount))
                    .build());

            // Update asset status after early termination
            asset.setStatus(IjarahDomainEnums.AssetStatus.OWNED_UNLEASED);
        }

        // Handle security deposit return
        if (contract.getSecurityDeposit() != null && contract.getSecurityDeposit().compareTo(BigDecimal.ZERO) > 0) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.RENTAL_PAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(IjarahSupport.money(contract.getSecurityDeposit()))
                    .reference(contract.getContractRef() + "-DEPOSIT-RETURN")
                    .valueDate(terminationDate)
                    .narration("Security deposit return on early termination")
                    .additionalContext(Map.of("depositReturn", true))
                    .build());
        }

        contract.setStatus(IjarahDomainEnums.ContractStatus.TERMINATED_EARLY);
        contract.setTerminatedAt(terminationDate);
        contract.setTerminationReason(request.getReason());
        if (contract.getImbTransferMechanismId() != null) {
            transferService.cancelTransfer(contract.getImbTransferMechanismId(), request.getReason());
        }
        // Unassign from investment pool
        if (contract.getPoolAssetAssignmentId() != null) {
            poolAssetManagementService.unassignAssetFromPool(contract.getPoolAssetAssignmentId(), "IJARAH_EARLY_TERMINATION");
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
        List<IjarahContract> activeContracts = contractRepository.findByStatus(IjarahDomainEnums.ContractStatus.ACTIVE);
        List<IjarahContract> arrearsContracts = contractRepository.findByStatus(IjarahDomainEnums.ContractStatus.RENTAL_ARREARS);
        List<IjarahContract> allActiveContracts = new java.util.ArrayList<>(activeContracts);
        allActiveContracts.addAll(arrearsContracts);

        BigDecimal totalAssets = contractRepository.sumAssetAcquisitionCostByStatus(IjarahDomainEnums.ContractStatus.ACTIVE)
                .add(contractRepository.sumAssetAcquisitionCostByStatus(IjarahDomainEnums.ContractStatus.RENTAL_ARREARS));

        Map<String, Long> byType = allActiveContracts.stream()
                .collect(java.util.stream.Collectors.groupingBy(c -> c.getIjarahType().name(), java.util.stream.Collectors.counting()));
        Map<String, Long> byStatus = allActiveContracts.stream()
                .collect(java.util.stream.Collectors.groupingBy(c -> c.getStatus().name(), java.util.stream.Collectors.counting()));

        return IjarahResponses.IjarahPortfolioSummary.builder()
                .totalContracts(allActiveContracts.size())
                .totalAssetsUnderIjarah(totalAssets)
                .rentalIncomeYtd(allActiveContracts.stream().map(c -> IjarahSupport.money(c.getTotalRentalsReceived())).reduce(IjarahSupport.ZERO, BigDecimal::add))
                .byType(byType)
                .byStatus(byStatus)
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
        return contractRepository.findByStatus(IjarahDomainEnums.ContractStatus.RENTAL_ARREARS);
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
