package com.cbs.achops.repository;

import com.cbs.achops.entity.AchItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AchItemRepository extends JpaRepository<AchItem, Long> {

    List<AchItem> findByBatchIdOrderBySequenceNumberAsc(Long batchId);

    Optional<AchItem> findByBatchIdAndId(Long batchId, Long itemId);

    long countByBatchIdAndStatus(Long batchId, String status);
}
