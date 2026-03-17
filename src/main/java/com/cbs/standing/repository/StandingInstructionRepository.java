package com.cbs.standing.repository;

import com.cbs.standing.entity.StandingInstruction;
import com.cbs.standing.entity.StandingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StandingInstructionRepository extends JpaRepository<StandingInstruction, Long> {

    Optional<StandingInstruction> findByInstructionRef(String ref);

    Page<StandingInstruction> findByDebitAccountId(Long accountId, Pageable pageable);

    @Query("SELECT si FROM StandingInstruction si WHERE si.status = 'ACTIVE' AND si.nextExecutionDate <= :date")
    List<StandingInstruction> findDueForExecution(@Param("date") LocalDate date);

    Page<StandingInstruction> findByStatus(StandingStatus status, Pageable pageable);

    @Query(value = "SELECT nextval('cbs.standing_instruction_seq')", nativeQuery = true)
    Long getNextInstructionSequence();
}
