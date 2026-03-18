package com.cbs.secposition.repository;

import com.cbs.secposition.entity.InstrumentValuation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InstrumentValuationRepository extends JpaRepository<InstrumentValuation, Long> {
    List<InstrumentValuation> findByRunId(Long runId);
    List<InstrumentValuation> findByRunIdAndDeviationBreachedTrue(Long runId);
    List<InstrumentValuation> findByRunIdAndStatus(Long runId, String status);
}
