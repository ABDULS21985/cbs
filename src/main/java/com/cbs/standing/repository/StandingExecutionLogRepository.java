package com.cbs.standing.repository;

import com.cbs.standing.entity.StandingExecutionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StandingExecutionLogRepository extends JpaRepository<StandingExecutionLog, Long> {

    Page<StandingExecutionLog> findByInstructionIdOrderByExecutionDateDesc(Long instructionId, Pageable pageable);
}
