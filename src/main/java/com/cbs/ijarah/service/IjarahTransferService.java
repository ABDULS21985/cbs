package com.cbs.ijarah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahGradualTransferUnit;
import com.cbs.ijarah.entity.IjarahTransferMechanism;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahGradualTransferUnitRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.ijarah.repository.IjarahTransferMechanismRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Transactional
public class IjarahTransferService {

    private static final AtomicLong TRANSFER_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);

    private final IjarahTransferMechanismRepository transferRepository;
    private final IjarahGradualTransferUnitRepository unitRepository;
    private final IjarahContractRepository contractRepository;
    private final IjarahRentalInstallmentRepository installmentRepository;
    private final IjarahAssetService assetService;
    private final IslamicPostingRuleService postingRuleService;
    private final PoolAssetManagementService poolAssetManagementService;

    public IjarahTransferMechanism createTransferMechanism(Long contractId, IjarahRequests.CreateTransferMechanismRequest request) {
        IjarahContract contract = getContract(contractId);
        if (contract.getIjarahType() != IjarahDomainEnums.IjarahType.IJARAH_MUNTAHIA_BITTAMLEEK) {
            throw new BusinessException("Transfer mechanism is only valid for IMB contracts", "INVALID_TRANSFER_MECHANISM");
        }
        if (!request.isSeparateDocument()) {
            throw new BusinessException("IMB transfer must be a separate document", "SHARIAH-IJR-004");
        }
        if (contract.getContractRef().equalsIgnoreCase(request.getDocumentReference())) {
            throw new BusinessException("Transfer document reference must differ from the lease reference", "SHARIAH-IJR-004");
        }

        IjarahTransferMechanism mechanism = IjarahTransferMechanism.builder()
                .transferRef(IjarahSupport.nextReference("IMB-TRF", TRANSFER_SEQUENCE))
                .ijarahContractId(contract.getId())
                .ijarahContractRef(contract.getContractRef())
                .customerId(contract.getCustomerId())
                .transferType(request.getTransferType())
                .transferDescription(request.getTransferDescription())
                .transferDescriptionAr(request.getTransferDescriptionAr())
                .isSeparateDocument(true)
                .documentDate(request.getDocumentDate())
                .documentReference(request.getDocumentReference())
                .documentType(request.getDocumentType())
                .nominalSalePrice(IjarahSupport.money(request.getNominalSalePrice()))
                .saleCurrency(request.getSaleCurrency())
                .fairValueDeterminationMethod(request.getFairValueDeterminationMethod())
                .fairValueAppraiser(request.getFairValueAppraiser())
                .estimatedFairValue(IjarahSupport.money(request.getEstimatedFairValue()))
                .totalTransferUnits(request.getTotalTransferUnits())
                .unitsTransferredToDate(0)
                .unitTransferFrequency(request.getUnitTransferFrequency())
                .unitTransferAmount(IjarahSupport.money(request.getUnitTransferAmount()))
                .status(IjarahDomainEnums.TransferStatus.DRAFT)
                .tenantId(contract.getTenantId())
                .build();
        mechanism = transferRepository.save(mechanism);

        if (request.getTransferType() == IjarahDomainEnums.TransferType.GRADUAL_TRANSFER) {
            generateUnitSchedule(contract, mechanism);
        }

        contract.setImbTransferMechanismId(mechanism.getId());
        contract.setImbTransferType(request.getTransferType());
        contract.setImbTransferScheduled(true);
        contractRepository.save(contract);
        return mechanism;
    }

    public void signTransferDocument(Long transferId, IjarahRequests.SignatureDetails request) {
        IjarahTransferMechanism mechanism = getTransferMechanism(transferId);
        mechanism.setSignedByBank(request.isBankSigned());
        mechanism.setSignedByBankDate(request.getBankSignedDate());
        mechanism.setSignedByBankRepresentative(request.getBankRepresentative());
        mechanism.setSignedByCustomer(request.isCustomerSigned());
        mechanism.setSignedByCustomerDate(request.getCustomerSignedDate());
        mechanism.setStatus(request.isBankSigned()
                ? IjarahDomainEnums.TransferStatus.ACTIVE
                : IjarahDomainEnums.TransferStatus.DRAFT);
        transferRepository.save(mechanism);
    }

    public IjarahTransferMechanism executeTransfer(Long transferId) {
        IjarahTransferMechanism mechanism = getTransferMechanism(transferId);
        IjarahContract contract = getContract(mechanism.getIjarahContractId());
        if (contract.getStatus() != IjarahDomainEnums.ContractStatus.MATURED
                && contract.getStatus() != IjarahDomainEnums.ContractStatus.ACTIVE) {
            throw new BusinessException("Ijarah transfer can only be executed at maturity", "INVALID_TRANSFER_STATUS");
        }
        ensureNoOutstandingRentals(contract.getId());

        var asset = assetService.findAsset(contract.getIjarahAssetId());
        BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
        BigDecimal accumulatedDepreciation = IjarahSupport.money(asset.getAccumulatedDepreciation());
        BigDecimal proceeds = saleProceeds(mechanism);
        BigDecimal gainLoss = proceeds.subtract(nbv);

        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.ASSET_TRANSFER)
                .amount(proceeds.max(BigDecimal.ONE))
                .valueDate(LocalDate.now())
                .reference(mechanism.getTransferRef())
                .additionalContext(Map.of(
                        "transferType", mechanism.getTransferType().name(),
                        "assetCost", IjarahSupport.money(asset.getAcquisitionCost()),
                        "accumulatedDepreciation", accumulatedDepreciation,
                        "netBookValue", nbv,
                        "saleProceeds", proceeds,
                        "gainAmount", gainLoss.compareTo(BigDecimal.ZERO) > 0 ? gainLoss : BigDecimal.ZERO,
                        "lossAmount", gainLoss.compareTo(BigDecimal.ZERO) < 0 ? gainLoss.abs() : BigDecimal.ZERO))
                .build());

        mechanism.setTransferJournalRef(journal.getJournalNumber());
        mechanism.setAssetNetBookValueAtTransfer(nbv);
        mechanism.setGainLossOnTransfer(gainLoss);
        mechanism.setExecutedAt(Instant.now());
        mechanism.setStatus(IjarahDomainEnums.TransferStatus.EXECUTED);
        mechanism.setTitleTransferDate(LocalDate.now());
        transferRepository.save(mechanism);

        asset.setStatus(IjarahDomainEnums.AssetStatus.TRANSFERRED_TO_CUSTOMER);
        asset.setDisposalDate(LocalDate.now());
        asset.setDisposalMethod(IjarahDomainEnums.DisposalMethod.GIFTED_IMB);
        asset.setDisposalProceeds(proceeds);
        asset.setDisposalJournalRef(journal.getJournalNumber());

        contract.setImbTransferCompleted(true);
        contract.setImbTransferDate(LocalDate.now());
        contract.setStatus(IjarahDomainEnums.ContractStatus.TRANSFERRED_TO_CUSTOMER);
        if (contract.getPoolAssetAssignmentId() != null) {
            poolAssetManagementService.unassignAssetFromPool(contract.getPoolAssetAssignmentId(), "IJARAH_IMB_TRANSFER");
        }
        contractRepository.save(contract);
        return transferRepository.save(mechanism);
    }

    public void processUnitTransfer(Long transferId, int unitNumber) {
        IjarahTransferMechanism mechanism = getTransferMechanism(transferId);
        if (mechanism.getTransferType() != IjarahDomainEnums.TransferType.GRADUAL_TRANSFER) {
            throw new BusinessException("Unit transfer is only valid for gradual IMB", "INVALID_UNIT_TRANSFER");
        }
        IjarahGradualTransferUnit unit = unitRepository.findByTransferMechanismIdAndUnitNumber(transferId, unitNumber)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahGradualTransferUnit", "unitNumber", unitNumber));
        if (unit.getStatus() == IjarahDomainEnums.UnitTransferStatus.TRANSFERRED) {
            return;
        }

        IjarahContract contract = getContract(mechanism.getIjarahContractId());
        var asset = assetService.findAsset(contract.getIjarahAssetId());
        BigDecimal unitProceeds = IjarahSupport.money(unit.getUnitPrice());
        BigDecimal proportionalNbv = IjarahSupport.money(
                IjarahSupport.money(asset.getNetBookValue())
                        .multiply(unit.getUnitPercentage())
                        .divide(IjarahSupport.HUNDRED, 8, java.math.RoundingMode.HALF_UP));
        BigDecimal gainLoss = unitProceeds.subtract(proportionalNbv);

        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.ASSET_TRANSFER)
                .amount(unitProceeds.max(BigDecimal.ONE))
                .reference(mechanism.getTransferRef() + "-UNIT-" + unitNumber)
                .valueDate(LocalDate.now())
                .additionalContext(Map.of(
                        "transferType", "GRADUAL_TRANSFER",
                        "assetCost", IjarahSupport.money(asset.getAcquisitionCost()),
                        "accumulatedDepreciation", IjarahSupport.money(asset.getAccumulatedDepreciation()),
                        "netBookValue", proportionalNbv,
                        "saleProceeds", unitProceeds,
                        "gainAmount", gainLoss.compareTo(BigDecimal.ZERO) > 0 ? gainLoss : BigDecimal.ZERO,
                        "lossAmount", gainLoss.compareTo(BigDecimal.ZERO) < 0 ? gainLoss.abs() : BigDecimal.ZERO))
                .build());

        unit.setStatus(IjarahDomainEnums.UnitTransferStatus.TRANSFERRED);
        unit.setTransferDate(LocalDate.now());
        unit.setPaymentAmount(unitProceeds);
        unit.setJournalRef(journal.getJournalNumber());
        unitRepository.save(unit);

        mechanism.setUnitsTransferredToDate((mechanism.getUnitsTransferredToDate() == null ? 0 : mechanism.getUnitsTransferredToDate()) + 1);
        if (mechanism.getUnitsTransferredToDate().equals(mechanism.getTotalTransferUnits())) {
            mechanism.setStatus(IjarahDomainEnums.TransferStatus.EXECUTED);
            contract.setImbTransferCompleted(true);
            contract.setImbTransferDate(LocalDate.now());
            contract.setStatus(IjarahDomainEnums.ContractStatus.TRANSFERRED_TO_CUSTOMER);
        } else {
            mechanism.setStatus(IjarahDomainEnums.TransferStatus.PARTIALLY_TRANSFERRED);
        }
        transferRepository.save(mechanism);
        contractRepository.save(contract);
    }

    public void cancelTransfer(Long transferId, String reason) {
        IjarahTransferMechanism mechanism = getTransferMechanism(transferId);
        mechanism.setStatus(IjarahDomainEnums.TransferStatus.CANCELLED);
        mechanism.setCancellationReason(reason);
        transferRepository.save(mechanism);
    }

    public void voidTransfer(Long transferId, String reason) {
        IjarahTransferMechanism mechanism = getTransferMechanism(transferId);
        mechanism.setStatus(IjarahDomainEnums.TransferStatus.VOID);
        mechanism.setCancellationReason(reason);
        transferRepository.save(mechanism);
    }

    @Transactional(readOnly = true)
    public IjarahTransferMechanism getTransferMechanism(Long transferId) {
        return transferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahTransferMechanism", "id", transferId));
    }

    @Transactional(readOnly = true)
    public IjarahTransferMechanism getTransferByContract(Long contractId) {
        return transferRepository.findByIjarahContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahTransferMechanism", "ijarahContractId", contractId));
    }

    @Transactional(readOnly = true)
    public List<IjarahTransferMechanism> getPendingTransfers() {
        return transferRepository.findByStatus(IjarahDomainEnums.TransferStatus.PENDING_EXECUTION);
    }

    @Transactional(readOnly = true)
    public List<IjarahGradualTransferUnit> getTransferSchedule(Long transferId) {
        return unitRepository.findByTransferMechanismIdOrderByUnitNumberAsc(transferId);
    }

    private void ensureNoOutstandingRentals(Long contractId) {
        boolean outstanding = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .anyMatch(installment -> installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.PAID
                        && installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.WAIVED
                        && installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.CANCELLED);
        if (outstanding) {
            throw new BusinessException("All rental obligations must be settled before transfer", "OUTSTANDING_RENTALS");
        }
    }

    private void generateUnitSchedule(IjarahContract contract, IjarahTransferMechanism mechanism) {
        int units = mechanism.getTotalTransferUnits() != null && mechanism.getTotalTransferUnits() > 0
                ? mechanism.getTotalTransferUnits()
                : 100;
        BigDecimal unitPercentage = IjarahSupport.HUNDRED.divide(BigDecimal.valueOf(units), 4, java.math.RoundingMode.HALF_UP);
        BigDecimal unitPrice = IjarahSupport.money(mechanism.getUnitTransferAmount());
        LocalDate baseDate = contract.getLeaseStartDate() != null ? contract.getLeaseStartDate() : LocalDate.now();

        for (int i = 1; i <= units; i++) {
            LocalDate scheduledDate = switch (mechanism.getUnitTransferFrequency() == null
                    ? IjarahDomainEnums.UnitTransferFrequency.MONTHLY
                    : mechanism.getUnitTransferFrequency()) {
                case MONTHLY -> baseDate.plusMonths(i);
                case QUARTERLY -> baseDate.plusMonths(i * 3L);
                case ANNUALLY -> baseDate.plusYears(i);
            };
            unitRepository.save(IjarahGradualTransferUnit.builder()
                    .transferMechanismId(mechanism.getId())
                    .unitNumber(i)
                    .scheduledDate(scheduledDate)
                    .unitPercentage(unitPercentage)
                    .unitPrice(unitPrice)
                    .cumulativeOwnership(unitPercentage.multiply(BigDecimal.valueOf(i)))
                    .status(IjarahDomainEnums.UnitTransferStatus.SCHEDULED)
                    .build());
        }
    }

    private BigDecimal saleProceeds(IjarahTransferMechanism mechanism) {
        return switch (mechanism.getTransferType()) {
            case GIFT_HIBAH -> BigDecimal.ZERO.setScale(2, java.math.RoundingMode.HALF_UP);
            case SALE_AT_NOMINAL -> IjarahSupport.money(mechanism.getNominalSalePrice() != null
                    ? mechanism.getNominalSalePrice()
                    : BigDecimal.ONE);
            case SALE_AT_FAIR_VALUE -> IjarahSupport.money(mechanism.getActualFairValue() != null
                    ? mechanism.getActualFairValue()
                    : mechanism.getEstimatedFairValue());
            case GRADUAL_TRANSFER -> BigDecimal.ZERO.setScale(2, java.math.RoundingMode.HALF_UP);
        };
    }

    private IjarahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
    }
}
