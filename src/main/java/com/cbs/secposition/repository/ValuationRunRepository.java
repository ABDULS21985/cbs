package com.cbs.secposition.repository;

import com.cbs.secposition.entity.ValuationRun;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ValuationRunRepository extends JpaRepository<ValuationRun, Long> {
    Optional<ValuationRun> findByRunRef(String runRef);
    List<ValuationRun> findByValuationDateOrderByRunStartedAtDesc(LocalDate valuationDate);
    List<ValuationRun> findByStatus(String status);
}
