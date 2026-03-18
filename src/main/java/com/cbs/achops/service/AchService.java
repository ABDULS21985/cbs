package com.cbs.achops.service;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.achops.entity.AchBatch;
import com.cbs.achops.repository.AchBatchRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AchService {
    private final AchBatchRepository batchRepository;
    @Transactional
    public AchBatch createBatch(AchBatch batch) {
        batch.setBatchId("ACH-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return batchRepository.save(batch);
    }
    @Transactional
    public AchBatch submit(String batchId) {
        AchBatch b = getBatch(batchId);
        if (!"VALIDATED".equals(b.getStatus()) && !"CREATED".equals(b.getStatus())) throw new BusinessException("Batch not ready for submission");
        b.setStatus("SUBMITTED"); b.setSubmittedAt(Instant.now());
        log.info("ACH batch submitted: id={}, operator={}, txns={}", batchId, b.getAchOperator(), b.getTotalTransactions());
        return batchRepository.save(b);
    }
    @Transactional
    public AchBatch settle(String batchId) {
        AchBatch b = getBatch(batchId); b.setStatus("SETTLED"); b.setSettledAt(Instant.now()); return batchRepository.save(b);
    }
    public List<AchBatch> getByOperator(String operator, String status) { return batchRepository.findByAchOperatorAndStatusOrderByEffectiveDateDesc(operator, status); }
    private AchBatch getBatch(String id) { return batchRepository.findByBatchId(id).orElseThrow(() -> new ResourceNotFoundException("AchBatch", "batchId", id)); }
}
