package com.cbs.compliancereport.service;

import com.cbs.common.audit.CurrentActorProvider;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ComplianceReport create(ComplianceReport report) {
        // Validation on create
        if (report.getReportType() == null || report.getReportType().isBlank()) {
            throw new BusinessException("Report type is required", "MISSING_REPORT_TYPE");
        }
        if (report.getRegulator() == null || report.getRegulator().isBlank()) {
            throw new BusinessException("Regulator is required", "MISSING_REGULATOR");
        }
        if (report.getDueDate() == null) {
            throw new BusinessException("Due date is required", "MISSING_DUE_DATE");
        }
        report.setReportCode("CR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        report.setStatus("DRAFT");
        ComplianceReport saved = repository.save(report);
        log.info("AUDIT: Compliance report created: code={}, type={}, regulator={}, actor={}",
                saved.getReportCode(), saved.getReportType(), saved.getRegulator(), currentActorProvider.getCurrentActor());
        return saved;
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
        ComplianceReport saved = repository.save(report);
        log.info("AUDIT: Compliance report submitted: code={}, ref={}, actor={}",
                reportCode, submissionReference, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ComplianceReport review(String reportCode, String reviewedBy) {
        ComplianceReport report = getByCode(reportCode);
        // Status guard: can't review already SUBMITTED reports
        if ("SUBMITTED".equals(report.getStatus())) {
            throw new BusinessException("Compliance report " + reportCode + " is already SUBMITTED and cannot be reviewed again", "ALREADY_SUBMITTED");
        }
        if ("REVIEWED".equals(report.getStatus())) {
            throw new BusinessException("Compliance report " + reportCode + " is already REVIEWED", "ALREADY_REVIEWED");
        }
        // Reviewer authorization: reviewer cannot be the same as the report creator
        if (reviewedBy == null || reviewedBy.isBlank()) {
            throw new BusinessException("Reviewer identity is required", "MISSING_REVIEWER");
        }
        if (reviewedBy.equals(report.getPreparedBy())) {
            throw new BusinessException("Reviewer cannot be the same person as the report preparer", "SELF_REVIEW_NOT_ALLOWED");
        }
        report.setStatus("REVIEWED");
        report.setReviewedBy(reviewedBy);
        report.setReviewedAt(Instant.now());
        ComplianceReport saved = repository.save(report);
        log.info("AUDIT: Compliance report reviewed: code={}, reviewer={}, actor={}",
                reportCode, reviewedBy, currentActorProvider.getCurrentActor());
        return saved;
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
