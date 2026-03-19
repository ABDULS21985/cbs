package com.cbs.ecl.repository;

import com.cbs.ecl.entity.EclBatchRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EclBatchRunRepository extends JpaRepository<EclBatchRun, Long> {

    Optional<EclBatchRun> findTopByOrderByCreatedAtDesc();

    Optional<EclBatchRun> findByJobId(String jobId);
}
