package com.cbs.security.repository;

import com.cbs.security.entity.SecurityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {
    Page<SecurityEvent> findByEventCategoryOrderByCreatedAtDesc(String eventCategory, Pageable pageable);
    Page<SecurityEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<SecurityEvent> findBySeverityAndIsAcknowledgedFalseOrderByCreatedAtDesc(String severity);
    long countByEventCategory(String eventCategory);
    long countBySeverity(String severity);
    long countByIsAcknowledgedFalse();
}
