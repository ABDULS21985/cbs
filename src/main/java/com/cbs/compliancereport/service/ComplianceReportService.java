package com.cbs.compliancereport.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.compliancereport.entity.ComplianceReport;
import com.cbs.compliancereport.repository.ComplianceReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ComplianceReportService {

    private final ComplianceReportRepository repository;

    @Transactional
    public ComplianceReport create(ComplianceReport report) {
        report.setReportCode("CR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return repository.save(report);
    }

    @Transactional
    public ComplianceReport submit(String reportCode, String submissionReference) {
        ComplianceReport report = getByCode(reportCode);
        if (!"REVIEWED".equals(report.getStatus())) {
            throw new BusinessException("Compliance report " + reportCode + " must be REVIEWED to submit; current status: " + report.getStatus());
        }
        report.setStatus("SUBMITTED");
        report.setSubmissionDate(LocalDate.now());
        report.setSubmissionReference(submissionReference);
        return repository.save(report);
    }

    @Transactional
    public ComplianceReport review(String reportCode, String reviewedBy) {
        ComplianceReport report = getByCode(reportCode);
        report.setStatus("REVIEWED");
        report.setReviewedBy(reviewedBy);
        report.setReviewedAt(Instant.now());
        return repository.save(report);
    }

    public List<ComplianceReport> getByRegulator(String regulator) {
        return repository.findByRegulatorAndStatusOrderByDueDateAsc(regulator, "SUBMITTED");
    }

    public List<ComplianceReport> getOverdue() {
        return repository.findByStatusNotAndDueDateBefore("SUBMITTED", LocalDate.now());
    }

    private ComplianceReport getByCode(String code) {
        return repository.findByReportCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", "reportCode", code));
    }
}
