package com.cbs.custody.repository;

import com.cbs.custody.entity.SettlementInstruction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SettlementInstructionRepository extends JpaRepository<SettlementInstruction, Long> {
    Optional<SettlementInstruction> findByInstructionRef(String instructionRef);
    List<SettlementInstruction> findByStatusOrderByIntendedSettlementDateAsc(String status);
    List<SettlementInstruction> findByStatusAndIntendedSettlementDate(String status, LocalDate date);
    List<SettlementInstruction> findByCustodyAccountIdAndStatus(Long custodyAccountId, String status);
}
