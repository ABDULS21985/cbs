package com.cbs.ijarah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahAssetMaintenanceRecord;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahAssetMaintenanceRecordRepository;
import com.cbs.ijarah.repository.IjarahAssetRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.profitdistribution.dto.RecordPoolExpenseRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IjarahAssetService {

    private static final AtomicLong ASSET_SEQUENCE = new AtomicLong(System.nanoTime());

    private final IjarahAssetRepository assetRepository;
    private final IjarahAssetMaintenanceRecordRepository maintenanceRecordRepository;
    private final IjarahContractRepository contractRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final PoolAssetManagementService poolAssetManagementService;

    public IjarahAsset registerAsset(IjarahRequests.RegisterAssetRequest request) {
        IjarahContract contract = resolveContract(request.getContractId());
        return assetRepository.findByIjarahContractId(contract.getId())
                .orElseGet(() -> assetRepository.save(IjarahAsset.builder()
                        .assetRef(IjarahSupport.nextReference("IJR-AST", ASSET_SEQUENCE))
                        .ijarahContractId(contract.getId())
                        .assetCategory(request.getAssetCategory() != null ? request.getAssetCategory() : contract.getAssetCategory())
                        .assetDescription(request.getAssetDescription() != null ? request.getAssetDescription() : contract.getAssetDescription())
                        .detailedSpecification(request.getDetailedSpecification() == null ? Map.of() : request.getDetailedSpecification())
                        .acquisitionDate(request.getAcquisitionDate())
                        .acquisitionCost(IjarahSupport.money(request.getAcquisitionCost() != null ? request.getAcquisitionCost() : contract.getAssetAcquisitionCost()))
                        .acquisitionMethod(request.getAcquisitionMethod() != null
                                ? request.getAcquisitionMethod()
                                : IjarahDomainEnums.AssetAcquisitionMethod.DIRECT_PURCHASE)
                        .supplierName(request.getSupplierName())
                        .supplierInvoiceRef(request.getSupplierInvoiceRef())
                        .currencyCode(request.getCurrencyCode() != null ? request.getCurrencyCode() : contract.getCurrencyCode())
                        .registeredOwner(request.getRegisteredOwner())
                        .registrationNumber(request.getRegistrationNumber())
                        .registrationAuthority(request.getRegistrationAuthority())
                        .registrationDate(request.getRegistrationDate())
                        .ownershipEvidenceRef(request.getOwnershipEvidenceRef())
                        .depreciationMethod(request.getDepreciationMethod() != null ? request.getDepreciationMethod() : IjarahDomainEnums.DepreciationMethod.STRAIGHT_LINE)
                        .usefulLifeMonths(request.getUsefulLifeMonths() != null ? request.getUsefulLifeMonths() : 60)
                        .residualValue(IjarahSupport.money(request.getResidualValue()))
                        .depreciableAmount(IjarahSupport.money(IjarahSupport.money(request.getAcquisitionCost() != null ? request.getAcquisitionCost() : contract.getAssetAcquisitionCost())
                                .subtract(IjarahSupport.money(request.getResidualValue()))))
                        .monthlyDepreciation(computeMonthlyDepreciation(
                                IjarahSupport.money(request.getAcquisitionCost() != null ? request.getAcquisitionCost() : contract.getAssetAcquisitionCost()),
                                IjarahSupport.money(request.getResidualValue()),
                                request.getUsefulLifeMonths() != null ? request.getUsefulLifeMonths() : 60))
                        .accumulatedDepreciation(IjarahSupport.ZERO)
                        .netBookValue(IjarahSupport.money(request.getAcquisitionCost() != null ? request.getAcquisitionCost() : contract.getAssetAcquisitionCost()))
                        .impairmentProvisionBalance(IjarahSupport.ZERO)
                        .currentCondition(IjarahDomainEnums.AssetCondition.NEW)
                        .insured(request.getInsurancePolicyRef() != null && request.getInsuranceExpiryDate() != null)
                        .insurancePolicyRef(request.getInsurancePolicyRef())
                        .insuranceProvider(request.getInsuranceProvider())
                        .insuranceCoverageAmount(IjarahSupport.money(request.getInsuranceCoverageAmount()))
                        .insurancePremiumAnnual(IjarahSupport.money(request.getInsurancePremiumAnnual()))
                        .insuranceExpiryDate(request.getInsuranceExpiryDate())
                        .totalMaintenanceCost(IjarahSupport.ZERO)
                        .status(IjarahDomainEnums.AssetStatus.OWNED_UNLEASED)
                        .leasedToCustomerId(contract.getCustomerId())
                        .leasedUnder(contract.getContractRef())
                        .tenantId(contract.getTenantId())
                        .build()));
    }

    public IjarahAsset registerAsset(Long contractId,
                                     IjarahRequests.AssetOwnershipConfirmation request,
                                     IjarahContract contract) {
        if (contract == null) {
            contract = contractRepository.findById(contractId)
                    .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
        }
        assetRepository.findByIjarahContractId(contract.getId()).ifPresent(existing -> {
            throw new BusinessException("Ijarah asset is already registered for this contract", "DUPLICATE_IJARAH_ASSET");
        });

        BigDecimal acquisitionCost = IjarahSupport.money(contract.getAssetAcquisitionCost());
        BigDecimal residualValue = IjarahSupport.money(request.getResidualValue());
        Integer life = request.getUsefulLifeMonths() != null ? request.getUsefulLifeMonths() : 60;
        BigDecimal depreciableAmount = IjarahSupport.money(acquisitionCost.subtract(residualValue));
        BigDecimal monthlyDepreciation = life > 0
                ? depreciableAmount.divide(BigDecimal.valueOf(life), 8, RoundingMode.HALF_UP).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        IjarahAsset asset = IjarahAsset.builder()
                .assetRef(IjarahSupport.nextReference("IJR-AST", ASSET_SEQUENCE))
                .ijarahContractId(contract.getId())
                .assetCategory(contract.getAssetCategory())
                .assetDescription(contract.getAssetDescription())
                .detailedSpecification(request.getDetailedSpecification() == null ? Map.of() : request.getDetailedSpecification())
                .acquisitionDate(request.getAcquisitionDate())
                .acquisitionCost(acquisitionCost)
                .acquisitionMethod(request.getAcquisitionMethod() != null
                        ? request.getAcquisitionMethod()
                        : IjarahDomainEnums.AssetAcquisitionMethod.DIRECT_PURCHASE)
                .supplierName(request.getSupplierName())
                .supplierInvoiceRef(request.getSupplierInvoiceRef())
                .currencyCode(contract.getCurrencyCode())
                .registeredOwner(request.getRegisteredOwner())
                .registrationNumber(request.getRegistrationNumber())
                .registrationAuthority(request.getRegistrationAuthority())
                .registrationDate(request.getRegistrationDate())
                .ownershipEvidenceRef(request.getOwnershipEvidenceRef())
                .depreciationMethod(request.getDepreciationMethod() != null
                        ? request.getDepreciationMethod()
                        : IjarahDomainEnums.DepreciationMethod.STRAIGHT_LINE)
                .usefulLifeMonths(life)
                .residualValue(residualValue)
                .depreciableAmount(depreciableAmount)
                .monthlyDepreciation(monthlyDepreciation)
                .accumulatedDepreciation(IjarahSupport.ZERO)
                .netBookValue(acquisitionCost)
                .impairmentProvisionBalance(IjarahSupport.ZERO)
                .currentCondition(IjarahDomainEnums.AssetCondition.NEW)
                .insured(request.getInsurancePolicyRef() != null && request.getInsuranceExpiryDate() != null)
                .insurancePolicyRef(request.getInsurancePolicyRef())
                .insuranceProvider(request.getInsuranceProvider())
                .insuranceCoverageAmount(IjarahSupport.money(request.getInsuranceCoverageAmount()))
                .insurancePremiumAnnual(IjarahSupport.money(request.getInsurancePremiumAnnual()))
                .insuranceExpiryDate(request.getInsuranceExpiryDate())
                .totalMaintenanceCost(IjarahSupport.ZERO)
                .status(IjarahDomainEnums.AssetStatus.OWNED_UNLEASED)
                .leasedToCustomerId(contract.getCustomerId())
                .leasedUnder(contract.getContractRef())
                .tenantId(contract.getTenantId())
                .build();
        return assetRepository.save(asset);
    }

    @Transactional(readOnly = true)
    public IjarahAsset getAsset(Long assetId) {
        return findAsset(assetId);
    }

    @Transactional(readOnly = true)
    public IjarahAsset getAssetByRef(String assetRef) {
        return assetRepository.findByAssetRef(assetRef)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahAsset", "assetRef", assetRef));
    }

    @Transactional(readOnly = true)
    public List<IjarahAsset> getAssetsByCategory(IjarahDomainEnums.AssetCategory category) {
        return assetRepository.findByAssetCategory(category);
    }

    @Transactional(readOnly = true)
    public List<IjarahAsset> getAssetsByStatus(IjarahDomainEnums.AssetStatus status) {
        return assetRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public List<IjarahAsset> getAllAssets() {
        return assetRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<IjarahAsset> getAssets(IjarahDomainEnums.AssetCategory category, IjarahDomainEnums.AssetStatus status) {
        if (category != null && status != null) {
            // Combined filter: filter by both category and status
            return getAssetsByCategory(category).stream()
                    .filter(asset -> asset.getStatus() == status)
                    .toList();
        }
        if (category != null) {
            return getAssetsByCategory(category);
        }
        if (status != null) {
            return getAssetsByStatus(status);
        }
        return getAllAssets();
    }

    public void processMonthlyDepreciation(Long assetId) {
        IjarahAsset asset = findAsset(assetId);
        if (asset.getStatus() == IjarahDomainEnums.AssetStatus.TOTAL_LOSS
                || asset.getStatus() == IjarahDomainEnums.AssetStatus.DISPOSED
                || asset.getStatus() == IjarahDomainEnums.AssetStatus.TRANSFERRED_TO_CUSTOMER) {
            return;
        }
        if (asset.getLastDepreciationDate() != null
                && asset.getLastDepreciationDate().getYear() == LocalDate.now().getYear()
                && asset.getLastDepreciationDate().getMonth() == LocalDate.now().getMonth()) {
            return;
        }
        BigDecimal floor = IjarahSupport.money(asset.getResidualValue());
        BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
        if (nbv.compareTo(floor) <= 0) {
            return;
        }
        BigDecimal depreciation;
        switch (asset.getDepreciationMethod() != null ? asset.getDepreciationMethod() : IjarahDomainEnums.DepreciationMethod.STRAIGHT_LINE) {
            case DECLINING_BALANCE -> {
                // Double declining balance: annualRate = 2 / usefulLifeYears, monthlyDepreciation = (NBV * annualRate) / 12
                int lifeMonths = asset.getUsefulLifeMonths() != null && asset.getUsefulLifeMonths() > 0 ? asset.getUsefulLifeMonths() : 60;
                BigDecimal usefulLifeYears = BigDecimal.valueOf(lifeMonths).divide(BigDecimal.valueOf(12), 8, RoundingMode.HALF_UP);
                BigDecimal annualRate = BigDecimal.valueOf(2).divide(usefulLifeYears, 8, RoundingMode.HALF_UP);
                depreciation = IjarahSupport.money(nbv.multiply(annualRate).divide(BigDecimal.valueOf(12), 8, RoundingMode.HALF_UP));
            }
            case UNITS_OF_PRODUCTION -> depreciation = computeUnitsOfProductionDepreciation(asset, nbv, floor);
            default -> depreciation = IjarahSupport.money(asset.getMonthlyDepreciation());
        }
        if (nbv.subtract(depreciation).compareTo(floor) < 0) {
            depreciation = IjarahSupport.money(nbv.subtract(floor));
        }
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.ASSET_DEPRECIATION)
                .amount(depreciation)
                .depreciation(depreciation)
                .valueDate(LocalDate.now())
                .reference(asset.getAssetRef() + "-DEPR-" + LocalDate.now())
                .build());

        asset.setAccumulatedDepreciation(IjarahSupport.money(asset.getAccumulatedDepreciation().add(depreciation)));
        asset.setNetBookValue(IjarahSupport.money(asset.getAcquisitionCost()
                .subtract(asset.getAccumulatedDepreciation())
                .subtract(IjarahSupport.money(asset.getImpairmentProvisionBalance()))));
        asset.setLastDepreciationDate(LocalDate.now());
        assetRepository.save(asset);
    }

    public void processDepreciationBatch() {
        assetRepository.findAll().stream()
                .filter(asset -> asset.getStatus() == IjarahDomainEnums.AssetStatus.LEASED
                        || asset.getStatus() == IjarahDomainEnums.AssetStatus.OWNED_UNLEASED)
                .forEach(asset -> {
                    try {
                        processMonthlyDepreciation(asset.getId());
                    } catch (Exception ex) {
                        log.error("Failed to process depreciation for asset {} (id={}): {}",
                                asset.getAssetRef(), asset.getId(), ex.getMessage(), ex);
                    }
                });
    }

    public IjarahAssetMaintenanceRecord recordMaintenance(Long assetId, IjarahRequests.MaintenanceRecordRequest request) {
        IjarahAsset asset = findAsset(assetId);
        IjarahAssetMaintenanceRecord record = IjarahAssetMaintenanceRecord.builder()
                .assetId(assetId)
                .maintenanceType(request.getMaintenanceType())
                .responsibleParty(request.getResponsibleParty())
                .description(request.getDescription())
                .cost(IjarahSupport.money(request.getCost()))
                .currencyCode(request.getCurrencyCode())
                .vendorName(request.getVendorName())
                .invoiceRef(request.getInvoiceRef())
                .maintenanceDate(request.getMaintenanceDate())
                .completionDate(request.getCompletionDate())
                .status(IjarahDomainEnums.MaintenanceStatus.COMPLETED)
                .build();

        if (request.getResponsibleParty() == IjarahDomainEnums.ResponsibleParty.BANK) {
            var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.FEE_CHARGE)
                    .amount(record.getCost())
                    .valueDate(request.getMaintenanceDate())
                    .reference(asset.getAssetRef() + "-MAINT-" + request.getMaintenanceDate())
                    .additionalContext(Map.of("feeType", "IJARAH_MAINTENANCE"))
                    .build());
            record.setJournalRef(journal.getJournalNumber());

            IjarahContract contract = resolveContract(asset.getIjarahContractId());
            if (contract.getInvestmentPoolId() != null) {
                poolAssetManagementService.recordExpense(contract.getInvestmentPoolId(), RecordPoolExpenseRequest.builder()
                        .poolId(contract.getInvestmentPoolId())
                        .expenseType("MAINTENANCE")
                        .amount(record.getCost())
                        .currencyCode(asset.getCurrencyCode())
                        .expenseDate(request.getMaintenanceDate())
                        .periodFrom(request.getMaintenanceDate())
                        .periodTo(request.getMaintenanceDate())
                        .journalRef(journal.getJournalNumber())
                        .description(request.getDescription())
                        .allocationMethod("DIRECT")
                        .build());
            }
        }

        if (request.getResponsibleParty() == IjarahDomainEnums.ResponsibleParty.BANK) {
            asset.setTotalMaintenanceCost(IjarahSupport.money(asset.getTotalMaintenanceCost().add(record.getCost())));
        }
        asset.setLastMaintenanceDate(request.getMaintenanceDate());
        assetRepository.save(asset);
        return maintenanceRecordRepository.save(record);
    }

    @Transactional(readOnly = true)
    public List<IjarahAssetMaintenanceRecord> getMaintenanceHistory(Long assetId) {
        findAsset(assetId);
        return maintenanceRecordRepository.findByAssetIdOrderByMaintenanceDateDesc(assetId);
    }

    public void updateInsurance(Long assetId, IjarahRequests.InsuranceUpdateRequest request) {
        IjarahAsset asset = findAsset(assetId);

        // Idempotency check: only post GL if this is a new premium or the premium amount changed
        BigDecimal existingPremium = IjarahSupport.money(asset.getInsurancePremiumAnnual());
        BigDecimal newPremium = IjarahSupport.money(request.getInsurancePremiumAnnual());
        boolean premiumChanged = newPremium.compareTo(BigDecimal.ZERO) > 0
                && newPremium.compareTo(existingPremium) != 0;

        asset.setInsured(request.isInsured());
        asset.setInsurancePolicyRef(request.getInsurancePolicyRef());
        asset.setInsuranceProvider(request.getInsuranceProvider());
        asset.setInsuranceCoverageAmount(IjarahSupport.money(request.getInsuranceCoverageAmount()));
        asset.setInsurancePremiumAnnual(newPremium);
        asset.setInsuranceExpiryDate(request.getInsuranceExpiryDate());
        assetRepository.save(asset);

        if (premiumChanged) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.FEE_CHARGE)
                    .amount(newPremium)
                    .valueDate(LocalDate.now())
                    .reference(asset.getAssetRef() + "-INS-" + LocalDate.now())
                    .additionalContext(Map.of("feeType", "IJARAH_INSURANCE"))
                    .build());
        }
    }

    public void recordValuation(Long assetId, IjarahRequests.ValuationRequest request) {
        IjarahAsset asset = findAsset(assetId);
        asset.setLastValuationDate(request.getValuationDate());
        asset.setLastValuationAmount(IjarahSupport.money(request.getValuationAmount()));
        asset.setValuationMethod(request.getValuationMethod());
        asset.setAppraiserName(request.getAppraiserName());
        assetRepository.save(asset);

        // Trigger impairment warning if valuation falls below net book value
        BigDecimal valuationAmount = IjarahSupport.money(request.getValuationAmount());
        BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
        if (valuationAmount.compareTo(nbv) < 0) {
            BigDecimal shortfall = nbv.subtract(valuationAmount);
            log.warn("IMPAIRMENT REVIEW SUGGESTED: Asset {} (ref={}) valuation {} is below NBV {} by {}. "
                            + "Consider posting impairment provision.",
                    assetId, asset.getAssetRef(), valuationAmount, nbv, shortfall);
        }
    }

    public void disposeAsset(Long assetId, IjarahRequests.AssetDisposalRequest request) {
        IjarahAsset asset = findAsset(assetId);
        // Status validation: cannot dispose an asset that is already in a terminal state
        if (asset.getStatus() == IjarahDomainEnums.AssetStatus.DISPOSED
                || asset.getStatus() == IjarahDomainEnums.AssetStatus.TRANSFERRED_TO_CUSTOMER
                || asset.getStatus() == IjarahDomainEnums.AssetStatus.TOTAL_LOSS) {
            throw new BusinessException("Asset in status " + asset.getStatus() + " cannot be disposed", "INVALID_ASSET_STATUS");
        }
        BigDecimal proceeds = IjarahSupport.money(request.getDisposalProceeds());
        BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
        BigDecimal gain = proceeds.subtract(nbv);
        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.ASSET_TRANSFER)
                .amount(proceeds.max(BigDecimal.ONE))
                .valueDate(request.getDisposalDate())
                .reference(asset.getAssetRef() + "-DISP")
                .additionalContext(Map.of(
                        "transferType", "ASSET_DISPOSAL",
                        "assetCost", IjarahSupport.money(asset.getAcquisitionCost()),
                        "accumulatedDepreciation", IjarahSupport.money(asset.getAccumulatedDepreciation()),
                        "netBookValue", nbv,
                        "saleProceeds", proceeds,
                        "gainAmount", gain.compareTo(BigDecimal.ZERO) > 0 ? gain : BigDecimal.ZERO,
                        "lossAmount", gain.compareTo(BigDecimal.ZERO) < 0 ? gain.abs() : BigDecimal.ZERO))
                .build());
        asset.setStatus(IjarahDomainEnums.AssetStatus.DISPOSED);
        asset.setDisposalDate(request.getDisposalDate());
        asset.setDisposalMethod(request.getDisposalMethod());
        asset.setDisposalProceeds(proceeds);
        asset.setDisposalJournalRef(journal.getJournalNumber());
        assetRepository.save(asset);

        // Cascade: update associated contract status when asset is disposed
        if (asset.getIjarahContractId() != null) {
            contractRepository.findById(asset.getIjarahContractId()).ifPresent(contract -> {
                if (contract.getStatus() == IjarahDomainEnums.ContractStatus.ACTIVE
                        || contract.getStatus() == IjarahDomainEnums.ContractStatus.RENTAL_ARREARS) {
                    contract.setStatus(IjarahDomainEnums.ContractStatus.TERMINATED_EARLY);
                    contract.setTerminatedAt(request.getDisposalDate());
                    contract.setTerminationReason("Asset disposed: " + request.getDisposalMethod());
                    // Unassign from investment pool
                    if (contract.getPoolAssetAssignmentId() != null) {
                        try {
                            poolAssetManagementService.unassignAssetFromPool(contract.getPoolAssetAssignmentId(), "IJARAH_ASSET_DISPOSAL");
                        } catch (RuntimeException ex) {
                            log.warn("Unable to unassign Ijarah asset {} from pool after disposal: {}",
                                    contract.getPoolAssetAssignmentId(), ex.getMessage());
                        }
                    }
                    contractRepository.save(contract);
                }
            });
        }
    }

    @Transactional(readOnly = true)
    public List<IjarahAsset> getAssetsWithExpiringInsurance(int daysAhead) {
        return assetRepository.findByInsuranceExpiryDateBefore(LocalDate.now().plusDays(daysAhead));
    }

    @Transactional(readOnly = true)
    public com.cbs.ijarah.dto.IjarahResponses.IjarahAssetDashboard getAssetDashboard() {
        List<IjarahAsset> assets = assetRepository.findAll();
        BigDecimal totalCost = assets.stream().map(IjarahAsset::getAcquisitionCost).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal totalNbv = assets.stream().map(asset -> IjarahSupport.money(asset.getNetBookValue())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal totalDepr = assets.stream().map(asset -> IjarahSupport.money(asset.getAccumulatedDepreciation())).reduce(IjarahSupport.ZERO, BigDecimal::add);

        return com.cbs.ijarah.dto.IjarahResponses.IjarahAssetDashboard.builder()
                .totalAssets(assets.size())
                .totalCost(totalCost)
                .totalAcquisitionCost(totalCost)
                .totalNetBookValue(totalNbv)
                .totalAccumulatedDepreciation(totalDepr)
                .byCategory(assets.stream().collect(java.util.stream.Collectors.groupingBy(asset -> asset.getAssetCategory().name(), java.util.stream.Collectors.counting())))
                .byStatus(assets.stream().collect(java.util.stream.Collectors.groupingBy(asset -> asset.getStatus().name(), java.util.stream.Collectors.counting())))
                .expiringInsuranceCount(getAssetsWithExpiringInsurance(30).size())
                .maintenanceDueCount(assetRepository.findByNextMaintenanceDueDateBefore(LocalDate.now().plusDays(30)).size())
                .fullyDepreciatedCount(assets.stream().filter(asset -> IjarahSupport.money(asset.getNetBookValue())
                        .compareTo(IjarahSupport.money(asset.getResidualValue())) <= 0).count())
                .build();
    }

    public IjarahAsset saveAsset(IjarahAsset asset) {
        return assetRepository.save(asset);
    }

    IjarahAsset findAsset(Long assetId) {
        return assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahAsset", "id", assetId));
    }

    private IjarahContract resolveContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
    }

    private BigDecimal computeMonthlyDepreciation(BigDecimal acquisitionCost, BigDecimal residualValue, int usefulLifeMonths) {
        if (usefulLifeMonths <= 0) {
            return IjarahSupport.ZERO;
        }
        return IjarahSupport.money(acquisitionCost.subtract(residualValue)
                .divide(BigDecimal.valueOf(usefulLifeMonths), 8, RoundingMode.HALF_UP));
    }

    private BigDecimal computeUnitsOfProductionDepreciation(IjarahAsset asset, BigDecimal netBookValue, BigDecimal residualFloor) {
        Map<String, Object> specification = asset.getDetailedSpecification() == null
                ? new HashMap<>()
                : new HashMap<>(asset.getDetailedSpecification());

        BigDecimal totalExpectedUnits = firstDecimal(specification,
                "totalExpectedUnits", "estimatedUsageUnits", "plannedTotalUnits");
        if (totalExpectedUnits == null || totalExpectedUnits.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Units-of-production depreciation for asset " + asset.getAssetRef()
                    + " requires 'totalExpectedUnits' in the asset specification but none was found. "
                    + "Please provide usage data or switch to a different depreciation method.",
                    "UOP_MISSING_TOTAL_UNITS");
        }

        BigDecimal unitsDepreciatedToDate = defaultDecimal(firstDecimal(specification,
                "unitsDepreciatedToDate", "cumulativeUnitsDepreciated"));
        BigDecimal unitsConsumedThisPeriod = firstDecimal(specification,
                "unitsConsumedThisPeriod", "usageThisPeriod", "unitsUsedSinceLastDepreciation");
        if (unitsConsumedThisPeriod == null || unitsConsumedThisPeriod.compareTo(BigDecimal.ZERO) <= 0) {
            BigDecimal cumulativeUnitsConsumed = firstDecimal(specification,
                    "unitsConsumedToDate", "cumulativeUnitsUsed", "usageToDate");
            if (cumulativeUnitsConsumed != null) {
                unitsConsumedThisPeriod = cumulativeUnitsConsumed.subtract(unitsDepreciatedToDate);
            }
        }

        if (unitsConsumedThisPeriod == null || unitsConsumedThisPeriod.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Units-of-production depreciation for asset " + asset.getAssetRef()
                    + " requires current-period usage data (e.g. 'unitsConsumedThisPeriod') in the asset specification "
                    + "but none was found. Please record usage or switch to a different depreciation method.",
                    "UOP_MISSING_USAGE_DATA");
        }

        BigDecimal remainingUnits = totalExpectedUnits.subtract(unitsDepreciatedToDate);
        if (remainingUnits.compareTo(BigDecimal.ZERO) <= 0) {
            return IjarahSupport.ZERO;
        }

        BigDecimal effectiveUnits = unitsConsumedThisPeriod.min(remainingUnits);
        BigDecimal depreciableRemaining = netBookValue.subtract(residualFloor).max(BigDecimal.ZERO);
        BigDecimal depreciation = IjarahSupport.money(depreciableRemaining.multiply(effectiveUnits)
                .divide(remainingUnits, 8, RoundingMode.HALF_UP));

        specification.put("unitsDepreciatedToDate", unitsDepreciatedToDate.add(effectiveUnits));
        specification.put("lastDepreciationUnits", effectiveUnits);
        specification.remove("unitsConsumedThisPeriod");
        specification.remove("usageThisPeriod");
        specification.remove("unitsUsedSinceLastDepreciation");
        asset.setDetailedSpecification(specification);
        return depreciation;
    }

    private BigDecimal firstDecimal(Map<String, Object> specification, String... keys) {
        for (String key : keys) {
            Object value = specification.get(key);
            if (value instanceof BigDecimal decimal) {
                return decimal;
            }
            if (value instanceof Number number) {
                return BigDecimal.valueOf(number.doubleValue());
            }
            if (value instanceof String text && !text.isBlank()) {
                try {
                    return new BigDecimal(text.trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
