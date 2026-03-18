package com.cbs.security.siem.repository;

import com.cbs.security.siem.entity.SiemEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SiemEventRepository extends JpaRepository<SiemEvent, Long> {
    Page<SiemEvent> findBySeverityOrderByEventTimestampDesc(String severity, Pageable pageable);
    Page<SiemEvent> findByEventCategoryOrderByEventTimestampDesc(String category, Pageable pageable);
    @Query("SELECT e FROM SiemEvent e WHERE e.forwardedToSiem = false ORDER BY e.id ASC")
    List<SiemEvent> findUnforwarded();
    Page<SiemEvent> findByCorrelationIdOrderByEventTimestampAsc(String correlationId, Pageable pageable);
}
