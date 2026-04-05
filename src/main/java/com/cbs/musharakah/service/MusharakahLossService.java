package com.cbs.musharakah.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahLossEvent;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahLossEventRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MusharakahLossService {

    private static final AtomicLong LOSS_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);

    private final MusharakahContractRepository contractRepository;
    private final MusharakahOwnershipUnitRepository ownershipUnitRepository;
    private final MusharakahLossEventRepository lossEventRepository;
    private final MusharakahRentalInstallmentRepository rentalInstallmentRepository;
    private final MusharakahBuyoutInstallmentRepository buyoutInstallmentRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final CurrentActorProvider actorProvider;

    public MusharakahResponses.MusharakahLossEventResponse recordLossEvent(Long contractId,
                                                                           MusharakahRequests.RecordLossEventRequest request) {
        MusharakahContract contract = getActiveContract(contractId);
        MusharakahLossEvent event = MusharakahLossEvent.builder()
                .contractId(contractId)
                .lossEventRef(MusharakahSupport.nextReference("MSH-LOSS", LOSS_SEQUENCE))
                .lossDate(request.getLossDate())
                .lossType(request.getLossType())
                .totalLossAmount(MusharakahSupport.money(request.getTotalLossAmount()))
                .currencyCode(request.getCurrencyCode())
                .description(request.getDescription())
                .cause(request.getCause())
                .evidenceReference(request.getEvidenceReference())
                .insured(Boolean.TRUE.equals(request.getInsured()))
                .insuranceClaimRef(request.getInsuranceClaimRef())
                .insuranceRecoveryExpected(MusharakahSupport.money(request.getInsuranceRecoveryExpected()))
                .status(MusharakahDomainEnums.LossStatus.DETECTED)
                .tenantId(contract.getTenantId())
                .build();
        return MusharakahSupport.toLossResponse(lossEventRepository.save(event));
    }

    public MusharakahResponses.MusharakahLossEventResponse assessLoss(Long lossEventId,
                                                                      MusharakahRequests.LossAssessmentRequest request) {
        MusharakahLossEvent event = getLossEventEntity(lossEventId);
        if (event.getStatus() != MusharakahDomainEnums.LossStatus.DETECTED) {
            throw new BusinessException(
                    "Loss assessment can only be performed on events in DETECTED status, current status: " + event.getStatus(),
                    "INVALID_LOSS_STATUS");
        }
        event.setTotalLossAmount(MusharakahSupport.money(request.getTotalLossAmount()));
        event.setEvidenceReference(request.getEvidenceReference());
        event.setInsuranceRecoveryExpected(MusharakahSupport.money(request.getInsuranceRecoveryExpected()));
        event.setStatus(MusharakahDomainEnums.LossStatus.ASSESSED);
        return MusharakahSupport.toLossResponse(lossEventRepository.save(event));
    }

    public MusharakahResponses.MusharakahLossEventResponse allocateLoss(Long lossEventId) {
        return allocateLoss(lossEventId, null, null);
    }

    public MusharakahResponses.MusharakahLossEventResponse allocateLoss(Long lossEventId,
                                                                        BigDecimal attemptedBankLossShare,
                                                                        BigDecimal attemptedCustomerLossShare) {
        MusharakahLossEvent event = getLossEventEntity(lossEventId);
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(event.getContractId())
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", event.getContractId()));

        BigDecimal bankCapitalRatio = ownership.getBankPercentage();
        BigDecimal customerCapitalRatio = ownership.getCustomerPercentage();
        BigDecimal bankLossShare = MusharakahSupport.money(
                event.getTotalLossAmount().multiply(bankCapitalRatio).divide(MusharakahSupport.HUNDRED, 8, RoundingMode.HALF_UP));
        BigDecimal customerLossShare = MusharakahSupport.money(event.getTotalLossAmount().subtract(bankLossShare));

        if (attemptedBankLossShare != null && MusharakahSupport.money(attemptedBankLossShare).compareTo(bankLossShare) != 0) {
            throw new BusinessException(
                    "ST-005 violation: Musharakah losses must be proportional to capital contribution. Bank capital ratio: "
                            + bankCapitalRatio.toPlainString() + "%, bank loss share must be " + bankLossShare.toPlainString(),
                    "SHARIAH-MSH-001");
        }
        if (attemptedCustomerLossShare != null && MusharakahSupport.money(attemptedCustomerLossShare).compareTo(customerLossShare) != 0) {
            throw new BusinessException("ST-005 violation: customer loss share must follow current capital contribution", "SHARIAH-MSH-001");
        }
        if (bankLossShare.add(customerLossShare).compareTo(MusharakahSupport.money(event.getTotalLossAmount())) != 0) {
            throw new BusinessException("Loss allocation must conserve total loss amount", "LOSS_ALLOCATION_CONSERVATION_FAILED");
        }

        event.setBankCapitalRatioAtLoss(bankCapitalRatio);
        event.setCustomerCapitalRatioAtLoss(customerCapitalRatio);
        event.setBankLossShare(bankLossShare);
        event.setCustomerLossShare(customerLossShare);
        event.setAllocationMethod("ST-005: Proportional to capital contribution at time of loss");
        event.setStatus(MusharakahDomainEnums.LossStatus.ALLOCATED);
        return MusharakahSupport.toLossResponse(lossEventRepository.save(event));
    }

    public void postLoss(Long lossEventId) {
        MusharakahLossEvent event = getLossEventEntity(lossEventId);
        if (event.getStatus() != MusharakahDomainEnums.LossStatus.ALLOCATED) {
            throw new BusinessException("Loss must be allocated before posting", "LOSS_NOT_ALLOCATED");
        }
        MusharakahContract contract = getContract(event.getContractId());
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(contract.getId())
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", contract.getId()));

        var bankJournal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MUSHARAKAH")
                .txnType(IslamicTransactionType.LOSS_ALLOCATION)
                .accountId(contract.getAccountId())
                .amount(event.getBankLossShare())
                .additionalContext(Map.of("lossPhase", "BANK"))
                .reference(event.getLossEventRef() + "-BANK")
                .narration("Musharakah bank loss allocation")
                .build());
        var customerJournal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MUSHARAKAH")
                .txnType(IslamicTransactionType.LOSS_ALLOCATION)
                .accountId(contract.getAccountId())
                .amount(event.getCustomerLossShare())
                .additionalContext(Map.of("lossPhase", "CUSTOMER"))
                .reference(event.getLossEventRef() + "-CUST")
                .narration("Musharakah customer loss allocation")
                .build());

        BigDecimal insuranceRecovery = MusharakahSupport.money(event.getInsuranceRecoveryExpected());
        BigDecimal netLossAfterInsurance = MusharakahSupport.money(event.getTotalLossAmount().subtract(insuranceRecovery));
        BigDecimal assetValueBeforeLoss = contract.getAssetCurrentMarketValue() != null
                ? MusharakahSupport.money(contract.getAssetCurrentMarketValue())
                : MusharakahSupport.money(contract.getTotalCapital());
        BigDecimal assetValueAfterLoss = MusharakahSupport.money(assetValueBeforeLoss.subtract(netLossAfterInsurance));
        if (assetValueAfterLoss.compareTo(BigDecimal.ZERO) < 0) {
            assetValueAfterLoss = MusharakahSupport.ZERO;
        }
        BigDecimal newUnitValue = ownership.getTotalUnits() > 0
                ? MusharakahSupport.unitPrice(assetValueAfterLoss.divide(BigDecimal.valueOf(ownership.getTotalUnits()), 8, RoundingMode.HALF_UP))
                : BigDecimal.ZERO;

        ownership.setCurrentUnitValue(newUnitValue);
        ownership.setBankShareValue(MusharakahSupport.money(ownership.getBankUnits().multiply(newUnitValue)));
        ownership.setCustomerShareValue(MusharakahSupport.money(ownership.getCustomerUnits().multiply(newUnitValue)));
        ownershipUnitRepository.save(ownership);

        contract.setAssetCurrentMarketValue(assetValueAfterLoss);
        contract.setAssetLastValuationDate(event.getLossDate());
        contract.setUnitValue(newUnitValue);
        contractRepository.save(contract);

        event.setBankLossJournalRef(bankJournal != null ? bankJournal.getJournalNumber() : null);
        event.setCustomerLossJournalRef(customerJournal != null ? customerJournal.getJournalNumber() : null);
        event.setBankShareValueAfterLoss(ownership.getBankShareValue());
        event.setCustomerShareValueAfterLoss(ownership.getCustomerShareValue());
        event.setAssetValueAfterLoss(assetValueAfterLoss);
        event.setNetLossAfterInsurance(netLossAfterInsurance);
        log.warn("Loss event {} compliance verification auto-stamped by system actor '{}' during postLoss. "
                + "Manual compliance review is recommended for loss events exceeding policy thresholds.",
                event.getLossEventRef(), actorProvider.getCurrentActor());
        event.setVerifiedByCompliance(true);
        event.setVerifiedBy(actorProvider.getCurrentActor());
        event.setVerifiedAt(LocalDateTime.now());
        event.setStatus(MusharakahDomainEnums.LossStatus.POSTED);
        lossEventRepository.save(event);
    }

    public void processAssetTotalLoss(Long contractId, MusharakahRequests.AssetTotalLossRequest request) {
        MusharakahContract contract = getActiveContract(contractId);
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", contractId));
        BigDecimal totalLoss = contract.getAssetCurrentMarketValue() != null
                ? contract.getAssetCurrentMarketValue()
                : ownership.getBankShareValue().add(ownership.getCustomerShareValue());

        MusharakahLossEvent event = MusharakahLossEvent.builder()
                .contractId(contractId)
                .lossEventRef(MusharakahSupport.nextReference("MSH-LOSS", LOSS_SEQUENCE))
                .lossDate(request.getLossDate())
                .lossType(MusharakahDomainEnums.LossType.ASSET_TOTAL_LOSS)
                .totalLossAmount(MusharakahSupport.money(totalLoss))
                .currencyCode(contract.getCurrencyCode())
                .description(request.getDescription())
                .cause(request.getCause())
                .insured(MusharakahSupport.money(request.getInsuranceRecoveryExpected()).compareTo(BigDecimal.ZERO) > 0)
                .insuranceClaimRef(request.getInsuranceClaimRef())
                .insuranceRecoveryExpected(MusharakahSupport.money(request.getInsuranceRecoveryExpected()))
                .status(MusharakahDomainEnums.LossStatus.ASSESSED)
                .tenantId(contract.getTenantId())
                .build();
        event = lossEventRepository.save(event);
        allocateLoss(event.getId());
        postLoss(event.getId());

        cancelFutureSchedules(contractId, request.getLossDate());
        contract.setStatus(MusharakahDomainEnums.ContractStatus.TERMINATED);
        contract.setDissolvedAt(request.getLossDate());
        contractRepository.save(contract);
    }

    public void processAssetImpairment(Long contractId, BigDecimal impairmentAmount, String valuationRef) {
        MusharakahContract contract = getActiveContract(contractId);
        MusharakahLossEvent event = MusharakahLossEvent.builder()
                .contractId(contractId)
                .lossEventRef(MusharakahSupport.nextReference("MSH-LOSS", LOSS_SEQUENCE))
                .lossDate(LocalDate.now())
                .lossType(MusharakahDomainEnums.LossType.ASSET_IMPAIRMENT)
                .totalLossAmount(MusharakahSupport.money(impairmentAmount))
                .currencyCode(contract.getCurrencyCode())
                .description("Asset impairment")
                .evidenceReference(valuationRef)
                .status(MusharakahDomainEnums.LossStatus.ASSESSED)
                .tenantId(contract.getTenantId())
                .build();
        event = lossEventRepository.save(event);
        allocateLoss(event.getId());
        postLoss(event.getId());
    }

    public MusharakahResponses.MusharakahLossEventResponse processForcedSaleLoss(Long contractId,
                                                                                 MusharakahRequests.ForcedSaleRequest request) {
        MusharakahContract contract = getActiveContract(contractId);
        BigDecimal assetValue = contract.getAssetCurrentMarketValue() != null
                ? contract.getAssetCurrentMarketValue()
                : contract.getTotalCapital();
        BigDecimal totalLoss = MusharakahSupport.money(assetValue.subtract(request.getSaleProceeds()));
        if (totalLoss.compareTo(BigDecimal.ZERO) < 0) {
            totalLoss = MusharakahSupport.ZERO;
        }

        MusharakahLossEvent event = MusharakahLossEvent.builder()
                .contractId(contractId)
                .lossEventRef(MusharakahSupport.nextReference("MSH-LOSS", LOSS_SEQUENCE))
                .lossDate(request.getSaleDate())
                .lossType(MusharakahDomainEnums.LossType.FORCED_SALE_LOSS)
                .totalLossAmount(totalLoss)
                .currencyCode(request.getCurrencyCode())
                .description(request.getDescription())
                .status(MusharakahDomainEnums.LossStatus.ASSESSED)
                .tenantId(contract.getTenantId())
                .build();
        event = lossEventRepository.save(event);
        allocateLoss(event.getId());
        postLoss(event.getId());
        contract.setStatus(MusharakahDomainEnums.ContractStatus.DISSOLVED);
        contract.setDissolvedAt(request.getSaleDate());
        contractRepository.save(contract);
        return getLossEvent(event.getId());
    }

    @Transactional(readOnly = true)
    public List<MusharakahResponses.MusharakahLossEventResponse> getLossHistory(Long contractId) {
        return lossEventRepository.findByContractIdOrderByLossDateAsc(contractId).stream()
                .map(MusharakahSupport::toLossResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahLossEventResponse getLossEvent(Long lossEventId) {
        return MusharakahSupport.toLossResponse(getLossEventEntity(lossEventId));
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalBankLosses(Long contractId) {
        return lossEventRepository.findByContractIdOrderByLossDateAsc(contractId).stream()
                .map(MusharakahLossEvent::getBankLossShare)
                .map(MusharakahSupport::money)
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalCustomerLosses(Long contractId) {
        return lossEventRepository.findByContractIdOrderByLossDateAsc(contractId).stream()
                .map(MusharakahLossEvent::getCustomerLossShare)
                .map(MusharakahSupport::money)
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
    }

    private void cancelFutureSchedules(Long contractId, LocalDate fromDate) {
        List<MusharakahRentalInstallment> rentals = rentalInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        for (MusharakahRentalInstallment rental : rentals) {
            if (rental.getDueDate().isAfter(fromDate)
                    && rental.getStatus() != MusharakahDomainEnums.InstallmentStatus.PAID) {
                rental.setStatus(MusharakahDomainEnums.InstallmentStatus.CANCELLED);
            }
        }
        List<MusharakahBuyoutInstallment> buyouts = buyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        for (MusharakahBuyoutInstallment buyout : buyouts) {
            if (buyout.getDueDate().isAfter(fromDate)
                    && buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.PAID) {
                buyout.setStatus(MusharakahDomainEnums.InstallmentStatus.CANCELLED);
            }
        }
    }

    private MusharakahContract getActiveContract(Long contractId) {
        MusharakahContract contract = getContract(contractId);
        if (contract.getStatus() != MusharakahDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS
                && contract.getStatus() != MusharakahDomainEnums.ContractStatus.BUYOUT_ARREARS) {
            throw new BusinessException("Loss events can only be recorded on active Musharakah contracts", "INVALID_CONTRACT_STATUS");
        }
        return contract;
    }

    private MusharakahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "id", contractId));
    }

    private MusharakahLossEvent getLossEventEntity(Long lossEventId) {
        return lossEventRepository.findById(lossEventId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahLossEvent", "id", lossEventId));
    }
}
