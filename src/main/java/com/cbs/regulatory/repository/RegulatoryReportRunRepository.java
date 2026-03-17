package com.cbs.regulatory.repository;

import com.cbs.regulatory.entity.RegulatoryReportRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RegulatoryReportRunRepository extends JpaRepository<RegulatoryReportRun, Long> {
    Page<RegulatoryReportRun> findByReportCodeOrderByCreatedAtDesc(String reportCode, Pageable pageable);
    Page<RegulatoryReportRun> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
