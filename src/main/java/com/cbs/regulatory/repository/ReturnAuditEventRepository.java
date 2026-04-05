package com.cbs.regulatory.repository;

import com.cbs.regulatory.entity.ReturnAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnAuditEventRepository extends JpaRepository<ReturnAuditEvent, Long> {

    List<ReturnAuditEvent> findByReturnIdOrderByEventTimestampAsc(Long returnId);
}
