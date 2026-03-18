package com.cbs.leasingitem.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.leasingitem.entity.LeasedAsset;
import com.cbs.leasingitem.repository.LeasedAssetRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class LeasedAssetService {
    private final LeasedAssetRepository repository;
    @Transactional public LeasedAsset register(LeasedAsset asset) { asset.setAssetCode("LA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); return repository.save(asset); }
    @Transactional public LeasedAsset recordInspection(String assetCode, String condition, LocalDate nextDue) {
        LeasedAsset a = getByCode(assetCode); a.setCondition(condition); a.setLastInspectionDate(LocalDate.now()); a.setNextInspectionDue(nextDue); return repository.save(a);
    }
    @Transactional public LeasedAsset returnAsset(String assetCode, String returnCondition) {
        LeasedAsset a = getByCode(assetCode); a.setReturnCondition(returnCondition); a.setReturnedAt(Instant.now()); a.setStatus("RETURNED"); return repository.save(a);
    }
    public List<LeasedAsset> getByContract(Long leaseContractId) { return repository.findByLeaseContractIdAndStatusOrderByAssetCodeAsc(leaseContractId, "ACTIVE"); }
    public List<LeasedAsset> getDueForInspection() { return repository.findByNextInspectionDueBeforeAndStatusOrderByNextInspectionDueAsc(LocalDate.now(), "ACTIVE"); }
    public LeasedAsset getByCode(String code) { return repository.findByAssetCode(code).orElseThrow(() -> new ResourceNotFoundException("LeasedAsset", "assetCode", code)); }
}
