package com.cbs.eod.repository;

import com.cbs.eod.entity.EodStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EodStepRepository extends JpaRepository<EodStep, Long> {
    List<EodStep> findByEodRunIdOrderByStepOrderAsc(Long eodRunId);
}
