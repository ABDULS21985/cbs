package com.cbs.achops.repository;
import com.cbs.achops.entity.AchBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface AchBatchRepository extends JpaRepository<AchBatch, Long> {
    Optional<AchBatch> findByBatchId(String batchId);
    List<AchBatch> findByAchOperatorAndStatusOrderByEffectiveDateDesc(String operator, String status);
    List<AchBatch> findByStatusOrderByEffectiveDateAsc(String status);
}
