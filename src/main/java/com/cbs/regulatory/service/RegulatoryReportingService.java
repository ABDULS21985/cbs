package com.cbs.regulatory.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.regulatory.entity.*;
import com.cbs.regulatory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RegulatoryReportingService {

    private final RegulatoryReportDefinitionRepository definitionRepository;
    private final RegulatoryReportRunRepository runRepository;

    @Transactional
    public RegulatoryReportDefinition createDefinition(RegulatoryReportDefinition def) {
        RegulatoryReportDefinition saved = definitionRepository.save(def);
        log.info("Regulatory report defined: code={}, regulator={}, freq={}", def.getReportCode(), def.getRegulator(), def.getFrequency());
        return saved;
    }

    public List<RegulatoryReportDefinition> getAllDefinitions() {
        return definitionRepository.findByIsActiveTrueOrderByReportNameAsc();
    }

    public List<RegulatoryReportDefinition> getByRegulator(String regulator) {
        return definitionRepository.findByRegulatorAndIsActiveTrue(regulator);
    }

    @Transactional
    public RegulatoryReportRun generateReport(String reportCode, LocalDate periodStart, LocalDate periodEnd, String generatedBy) {
        RegulatoryReportDefinition def = definitionRepository.findByReportCode(reportCode)
                .orElseThrow(() -> new ResourceNotFoundException("ReportDefinition", "reportCode", reportCode));

        long startTime = System.currentTimeMillis();

        RegulatoryReportRun run = RegulatoryReportRun.builder()
                .reportCode(reportCode)
                .reportingPeriodStart(periodStart).reportingPeriodEnd(periodEnd)
                .status("GENERATING").generatedBy(generatedBy).generatedAt(Instant.now()).build();

        try {
            // In production: execute data_query, populate template, generate file
            // Simulated generation
            int recordCount = (int)(Math.random() * 10000) + 100;
            long fileSize = recordCount * 256L;
            String filePath = String.format("/reports/%s/%s_%s_%s.%s",
                    def.getRegulator(), reportCode, periodStart, periodEnd,
                    def.getOutputFormat().toLowerCase());

            run.setRecordCount(recordCount);
            run.setFilePath(filePath);
            run.setFileSizeBytes(fileSize);
            run.setGenerationTimeMs((int)(System.currentTimeMillis() - startTime));
            run.setStatus("COMPLETED");

            log.info("Report generated: code={}, period={}-{}, records={}, time={}ms",
                    reportCode, periodStart, periodEnd, recordCount, run.getGenerationTimeMs());
        } catch (Exception e) {
            run.setStatus("FAILED");
            run.setErrorMessage(e.getMessage());
            log.error("Report generation failed: code={}, error={}", reportCode, e.getMessage());
        }

        return runRepository.save(run);
    }

    @Transactional
    public RegulatoryReportRun submitReport(Long runId, String submittedBy) {
        RegulatoryReportRun run = runRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("ReportRun", "id", runId));

        if (!"COMPLETED".equals(run.getStatus())) {
            throw new BusinessException("Report must be in COMPLETED status to submit", "REPORT_NOT_COMPLETED");
        }

        run.setStatus("SUBMITTED");
        run.setSubmittedBy(submittedBy);
        run.setSubmittedAt(Instant.now());
        run.setSubmissionRef("SUB-" + System.currentTimeMillis());

        log.info("Report submitted: code={}, ref={}", run.getReportCode(), run.getSubmissionRef());
        return runRepository.save(run);
    }

    public Page<RegulatoryReportRun> getReportRuns(String reportCode, Pageable pageable) {
        return runRepository.findByReportCodeOrderByCreatedAtDesc(reportCode, pageable);
    }
}
