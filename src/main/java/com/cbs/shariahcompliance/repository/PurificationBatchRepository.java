package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.PurificationBatch;
import com.cbs.shariahcompliance.entity.PurificationBatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurificationBatchRepository extends JpaRepository<PurificationBatch, Long> {

    Optional<PurificationBatch> findByBatchRef(String batchRef);

    List<PurificationBatch> findByStatus(PurificationBatchStatus status);
}
