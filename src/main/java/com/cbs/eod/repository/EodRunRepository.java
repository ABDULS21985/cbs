package com.cbs.eod.repository;

import com.cbs.eod.entity.EodRun;
import com.cbs.eod.entity.EodRunType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface EodRunRepository extends JpaRepository<EodRun, Long> {
    Optional<EodRun> findByBusinessDateAndRunType(LocalDate businessDate, EodRunType runType);
    Page<EodRun> findByRunTypeOrderByBusinessDateDesc(EodRunType runType, Pageable pageable);
    Optional<EodRun> findTopByRunTypeOrderByBusinessDateDesc(EodRunType runType);
}
