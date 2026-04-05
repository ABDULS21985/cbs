package com.cbs.oprisk.repository;

import com.cbs.oprisk.entity.OpRiskLossEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface OpRiskLossEventRepository extends JpaRepository<OpRiskLossEvent, Long> {
    Page<OpRiskLossEvent> findByEventCategoryOrderByEventDateDesc(String category, Pageable pageable);
    Page<OpRiskLossEvent> findByStatusOrderByNetLossDesc(String status, Pageable pageable);
    @Query("SELECT SUM(e.netLoss) FROM OpRiskLossEvent e WHERE e.eventDate BETWEEN :from AND :to")
    BigDecimal totalNetLoss(@Param("from") LocalDate from, @Param("to") LocalDate to);
    List<OpRiskLossEvent> findByEventDateBetween(LocalDate from, LocalDate to);
}
