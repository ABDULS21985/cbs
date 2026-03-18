package com.cbs.custody.repository;

import com.cbs.custody.entity.SettlementBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SettlementBatchRepository extends JpaRepository<SettlementBatch, Long> {
    Optional<SettlementBatch> findByBatchRef(String batchRef);
    List<SettlementBatch> findBySettlementDateAndStatus(LocalDate settlementDate, String status);
    List<SettlementBatch> findByStatusOrderBySettlementDateDesc(String status);
}
