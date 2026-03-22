package com.cbs.alm.repository;

import com.cbs.alm.entity.StressTestRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StressTestRunRepository extends JpaRepository<StressTestRun, Long> {

    List<StressTestRun> findAllByOrderByRunAtDesc();

    List<StressTestRun> findByScenarioIdOrderByRunAtDesc(Long scenarioId);
}
