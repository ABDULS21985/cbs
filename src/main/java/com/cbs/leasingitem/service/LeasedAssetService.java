package com.cbs.leasingitem.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.leasingitem.entity.LeasedAsset;
import com.cbs.leasingitem.repository.LeasedAssetRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class LeasedAssetService {
    private final LeasedAssetRepository repository;
    @Transactional public LeasedAsset register(LeasedAsset asset) {
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
        return repository.save(asset);
    }
    @Transactional public LeasedAsset recordInspection(String assetCode, String condition, LocalDate nextDue) {
        LeasedAsset a = getByCode(assetCode); a.setCondition(condition); a.setLastInspectionDate(LocalDate.now()); a.setNextInspectionDue(nextDue); return repository.save(a);
    }
    @Transactional public LeasedAsset returnAsset(String assetCode, String returnCondition) {
        LeasedAsset a = getByCode(assetCode);
        a.setReturnCondition(StringUtils.hasText(returnCondition) ? returnCondition : a.getCondition());
        a.setReturnedAt(Instant.now());
        a.setStatus("RETURNED");
        return repository.save(a);
    }
    public List<LeasedAsset> getAll() { return repository.findAllByOrderByAssetCodeAsc(); }
    public List<LeasedAsset> getByContract(Long leaseContractId) { return repository.findByLeaseContractIdOrderByAssetCodeAsc(leaseContractId); }
    public List<LeasedAsset> getDueForInspection() { return repository.findByNextInspectionDueBeforeAndStatusOrderByNextInspectionDueAsc(LocalDate.now(), "ACTIVE"); }
    public LeasedAsset getByCode(String code) { return repository.findByAssetCode(code).orElseThrow(() -> new ResourceNotFoundException("LeasedAsset", "assetCode", code)); }
}
