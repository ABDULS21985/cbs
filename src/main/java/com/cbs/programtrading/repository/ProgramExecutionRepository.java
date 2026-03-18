package com.cbs.programtrading.repository;

import com.cbs.programtrading.entity.ProgramExecution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProgramExecutionRepository extends JpaRepository<ProgramExecution, Long> {
    Optional<ProgramExecution> findByExecutionRef(String executionRef);
    List<ProgramExecution> findByStatusOrderByExecutionDateDesc(String status);
    List<ProgramExecution> findByStrategyIdOrderByExecutionDateDesc(Long strategyId);
}
