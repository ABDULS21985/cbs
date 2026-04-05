package com.cbs.leasingitem.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.leasingitem.entity.LeasedAsset;
import com.cbs.leasingitem.repository.LeasedAssetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LeasedAssetService {

    private final LeasedAssetRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public LeasedAsset register(LeasedAsset asset) {
        // Validate lease contract is specified
        if (asset.getLeaseContractId() == null) {
            throw new BusinessException("leaseContractId is required", "MISSING_CONTRACT_ID");
        }
        // Validate required fields
        if (!StringUtils.hasText(asset.getAssetType())) {
            throw new BusinessException("assetType is required", "MISSING_ASSET_TYPE");
        }
        if (!StringUtils.hasText(asset.getDescription())) {
            throw new BusinessException("description is required", "MISSING_DESCRIPTION");
        }
        if (asset.getOriginalCost() == null || asset.getOriginalCost().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("originalCost must be greater than zero", "INVALID_ORIGINAL_COST");
        }

        // Duplicate check by serial number
        if (StringUtils.hasText(asset.getSerialNumber())) {
            repository.findByAssetCode(asset.getSerialNumber()); // no-op, check by serial
            repository.findAllByOrderByAssetCodeAsc().stream()
                    .filter(a -> asset.getSerialNumber().equals(a.getSerialNumber()))
                    .findFirst()
                    .ifPresent(existing -> {
                        throw new BusinessException("Asset with serial number " + asset.getSerialNumber() + " already registered as " + existing.getAssetCode(), "DUPLICATE_SERIAL");
                    });
        }

        asset.setAssetCode("LA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (asset.getCurrentBookValue() == null) {
            asset.setCurrentBookValue(asset.getOriginalCost() != null ? asset.getOriginalCost() : BigDecimal.ZERO);
        }
        if (!StringUtils.hasText(asset.getStatus())) {
            asset.setStatus("ACTIVE");
        }
        if (!StringUtils.hasText(asset.getCondition())) {
            asset.setCondition("GOOD");
        }
        LeasedAsset saved = repository.save(asset);
        log.info("AUDIT: Leased asset registered by {}: assetCode={}, contractId={}, type={}, cost={}",
                currentActorProvider.getCurrentActor(), saved.getAssetCode(), saved.getLeaseContractId(), saved.getAssetType(), saved.getOriginalCost());
        return saved;
    }

    @Transactional
    public LeasedAsset recordInspection(String assetCode, String condition, LocalDate nextDue) {
        LeasedAsset a = getByCode(assetCode);
        if (!"ACTIVE".equals(a.getStatus())) {
            throw new BusinessException("Cannot inspect asset in status " + a.getStatus() + "; must be ACTIVE", "INVALID_STATE");
        }
        if (!StringUtils.hasText(condition)) {
            throw new BusinessException("Inspection condition is required", "MISSING_CONDITION");
        }
        a.setCondition(condition);
        a.setLastInspectionDate(LocalDate.now());
        a.setNextInspectionDue(nextDue);
        LeasedAsset saved = repository.save(a);
        log.info("AUDIT: Asset inspection recorded by {}: assetCode={}, condition={}, nextDue={}",
                currentActorProvider.getCurrentActor(), assetCode, condition, nextDue);
        return saved;
    }

    @Transactional
    public LeasedAsset returnAsset(String assetCode, String returnCondition) {
        LeasedAsset a = getByCode(assetCode);
        // State guard: can only return ACTIVE assets
        if (!"ACTIVE".equals(a.getStatus())) {
            throw new BusinessException("Cannot return asset in status " + a.getStatus() + "; must be ACTIVE", "INVALID_STATE");
        }
        a.setReturnCondition(StringUtils.hasText(returnCondition) ? returnCondition : a.getCondition());
        a.setReturnedAt(Instant.now());
        a.setStatus("RETURNED");

        // Damage assessment: if return condition is worse than current condition, flag it
        if (isDamaged(a.getCondition(), a.getReturnCondition())) {
            log.warn("AUDIT: Asset returned with damage: assetCode={}, originalCondition={}, returnCondition={}",
                    assetCode, a.getCondition(), a.getReturnCondition());
        }

        LeasedAsset saved = repository.save(a);
        log.info("AUDIT: Asset returned by {}: assetCode={}, returnCondition={}",
                currentActorProvider.getCurrentActor(), assetCode, a.getReturnCondition());
        return saved;
    }

    public List<LeasedAsset> getAll() {
        return repository.findAllByOrderByAssetCodeAsc();
    }

    public List<LeasedAsset> getByContract(Long leaseContractId) {
        return repository.findByLeaseContractIdOrderByAssetCodeAsc(leaseContractId);
    }

    public List<LeasedAsset> getDueForInspection() {
        return repository.findByNextInspectionDueBeforeAndStatusOrderByNextInspectionDueAsc(LocalDate.now(), "ACTIVE");
    }

    public LeasedAsset getByCode(String code) {
        return repository.findByAssetCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("LeasedAsset", "assetCode", code));
    }

    /**
     * Simple damage assessment: compares condition ratings.
     * Returns true if returnCondition is worse than currentCondition.
     */
    private boolean isDamaged(String currentCondition, String returnCondition) {
        int currentRank = conditionRank(currentCondition);
        int returnRank = conditionRank(returnCondition);
        return returnRank < currentRank;
    }

    private int conditionRank(String condition) {
        if (condition == null) return 0;
        return switch (condition.toUpperCase()) {
            case "EXCELLENT" -> 5;
            case "GOOD" -> 4;
            case "FAIR" -> 3;
            case "POOR" -> 2;
            case "DAMAGED" -> 1;
            default -> 0;
        };
    }
}
