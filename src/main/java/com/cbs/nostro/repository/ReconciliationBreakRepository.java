package com.cbs.nostro.repository;

import com.cbs.nostro.entity.ReconciliationBreak;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReconciliationBreakRepository extends JpaRepository<ReconciliationBreak, Long> {

    Page<ReconciliationBreak> findAllByOrderByDetectedDateDesc(Pageable pageable);

    List<ReconciliationBreak> findByStatus(String status);

    List<ReconciliationBreak> findByCurrency(String currency);

    List<ReconciliationBreak> findByAssignedTo(String assignedTo);

    @Query("SELECT b FROM ReconciliationBreak b WHERE " +
           "(:status IS NULL OR b.status = :status) AND " +
           "(:currency IS NULL OR b.currency = :currency) AND " +
           "(:assignedTo IS NULL OR b.assignedTo = :assignedTo) " +
           "ORDER BY b.detectedDate DESC")
    List<ReconciliationBreak> findByFilters(
            @Param("status") String status,
            @Param("currency") String currency,
            @Param("assignedTo") String assignedTo);

    @Modifying
    @Query("UPDATE ReconciliationBreak b SET b.assignedTo = :assignee, b.updatedAt = CURRENT_TIMESTAMP WHERE b.id IN :ids")
    int bulkAssign(@Param("ids") List<Long> ids, @Param("assignee") String assignee);

    long countByStatus(String status);
}
