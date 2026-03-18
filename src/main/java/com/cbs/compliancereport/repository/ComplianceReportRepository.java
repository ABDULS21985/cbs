package com.cbs.compliancereport.repository;

import com.cbs.compliancereport.entity.ComplianceReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ComplianceReportRepository extends JpaRepository<ComplianceReport, Long> {
    Optional<ComplianceReport> findByReportCode(String reportCode);
    List<ComplianceReport> findByRegulatorAndStatusOrderByDueDateAsc(String regulator, String status);
    List<ComplianceReport> findByStatusOrderByDueDateAsc(String status);
    List<ComplianceReport> findByStatusNotAndDueDateBefore(String status, LocalDate date);
}
