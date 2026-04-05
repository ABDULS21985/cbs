package com.cbs.marketanalysis.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketanalysis.entity.MarketAnalysisReport;
import com.cbs.marketanalysis.repository.MarketAnalysisReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketAnalysisService {

    private final MarketAnalysisReportRepository repository;
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_ANALYSIS_TYPES = Set.of(
            "MARKET_OVERVIEW", "SECTOR_ANALYSIS", "COMPETITIVE_LANDSCAPE",
            "REGULATORY_IMPACT", "ECONOMIC_OUTLOOK", "PRODUCT_DEMAND"
    );

    @Transactional
    public MarketAnalysisReport create(MarketAnalysisReport report) {
        validateReportFields(report);

        if (repository.existsByReportNameAndAnalysisType(report.getReportName(), report.getAnalysisType())) {
            throw new BusinessException(
                    "A report with name '" + report.getReportName() + "' and type '" + report.getAnalysisType() + "' already exists.",
                    "DUPLICATE_REPORT"
            );
        }

        report.setReportCode("MAR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (report.getAnalysisDate() == null) {
            report.setAnalysisDate(LocalDate.now());
        }
        if (report.getRegion() == null || report.getRegion().isBlank()) {
            report.setRegion("NIGERIA");
        }
        report.setStatus("DRAFT");
        if (report.getAnalyst() == null || report.getAnalyst().isBlank()) {
            report.setAnalyst(currentActorProvider.getCurrentActor());
        }

        MarketAnalysisReport saved = repository.save(report);
        log.info("Market analysis report created: code={}, type={}, by={}",
                saved.getReportCode(), saved.getAnalysisType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarketAnalysisReport submitForReview(String reportCode) {
        MarketAnalysisReport report = getByCode(reportCode);
        if (!"DRAFT".equals(report.getStatus())) {
            throw new BusinessException(
                    "Report must be in DRAFT status to submit for review. Current status: " + report.getStatus(),
                    "INVALID_STATUS"
            );
        }
        if (report.getExecutiveSummary() == null || report.getExecutiveSummary().isBlank()) {
            throw new BusinessException("Executive summary is required before submitting for review.", "MISSING_SUMMARY");
        }
        report.setStatus("REVIEWED");
        MarketAnalysisReport saved = repository.save(report);
        log.info("Report submitted for review: code={}, by={}", reportCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarketAnalysisReport approve(String reportCode) {
        MarketAnalysisReport report = getByCode(reportCode);
        if (!"REVIEWED".equals(report.getStatus())) {
            throw new BusinessException(
                    "Report must be in REVIEWED status to approve. Current status: " + report.getStatus(),
                    "INVALID_STATUS"
            );
        }
        String approver = currentActorProvider.getCurrentActor();
        if (approver.equals(report.getAnalyst())) {
            throw new BusinessException("The report analyst cannot approve their own report.", "SELF_APPROVAL");
        }
        report.setStatus("PUBLISHED");
        report.setPublishedAt(Instant.now());
        MarketAnalysisReport saved = repository.save(report);
        log.info("Report approved and published: code={}, by={}", reportCode, approver);
        return saved;
    }

    @Transactional
    public MarketAnalysisReport publish(String reportCode) {
        MarketAnalysisReport report = getByCode(reportCode);
        if ("PUBLISHED".equals(report.getStatus())) {
            throw new BusinessException("Market analysis report " + reportCode + " is already published.");
        }
        if (!"REVIEWED".equals(report.getStatus()) && !"DRAFT".equals(report.getStatus())) {
            throw new BusinessException(
                    "Report must be in DRAFT or REVIEWED status to publish. Current status: " + report.getStatus(),
                    "INVALID_STATUS"
            );
        }
        if (report.getExecutiveSummary() == null || report.getExecutiveSummary().isBlank()) {
            throw new BusinessException("Executive summary is required before publishing.", "MISSING_SUMMARY");
        }
        report.setStatus("PUBLISHED");
        report.setPublishedAt(Instant.now());
        MarketAnalysisReport saved = repository.save(report);
        log.info("Report published: code={}, by={}", reportCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarketAnalysisReport archive(String reportCode) {
        MarketAnalysisReport report = getByCode(reportCode);
        if ("ARCHIVED".equals(report.getStatus())) {
            throw new BusinessException("Report " + reportCode + " is already archived.", "ALREADY_ARCHIVED");
        }
        report.setStatus("ARCHIVED");
        log.info("Report archived: code={}, by={}", reportCode, currentActorProvider.getCurrentActor());
        return repository.save(report);
    }

    public List<MarketAnalysisReport> getByType(String analysisType) {
        return repository.findByAnalysisTypeAndStatusOrderByAnalysisDateDesc(analysisType, "PUBLISHED");
    }

    public List<MarketAnalysisReport> getPublished() {
        return repository.findByStatusOrderByAnalysisDateDesc("PUBLISHED");
    }

    public List<MarketAnalysisReport> getByAnalyst(String analyst) {
        if (analyst == null || analyst.isBlank()) {
            throw new BusinessException("Analyst name is required.", "INVALID_ANALYST");
        }
        return repository.findByAnalystContainingIgnoreCaseOrderByAnalysisDateDesc(analyst);
    }

    public List<MarketAnalysisReport> getByRegion(String region) {
        if (region == null || region.isBlank()) {
            throw new BusinessException("Region is required.", "INVALID_REGION");
        }
        return repository.findByRegionAndStatusOrderByAnalysisDateDesc(region, "PUBLISHED");
    }

    public List<MarketAnalysisReport> getDrafts() {
        return repository.findByStatusOrderByAnalysisDateDesc("DRAFT");
    }

    public List<MarketAnalysisReport> getAllReports() {
        return repository.findAll();
    }

    private MarketAnalysisReport getByCode(String code) {
        return repository.findByReportCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketAnalysisReport", "reportCode", code));
    }

    private void validateReportFields(MarketAnalysisReport report) {
        if (report.getReportName() == null || report.getReportName().isBlank()) {
            throw new BusinessException("Report name is required.", "INVALID_NAME");
        }
        if (report.getReportName().length() > 300) {
            throw new BusinessException("Report name must not exceed 300 characters.", "NAME_TOO_LONG");
        }
        if (report.getAnalysisType() == null || report.getAnalysisType().isBlank()) {
            throw new BusinessException("Analysis type is required.", "INVALID_TYPE");
        }
        if (!VALID_ANALYSIS_TYPES.contains(report.getAnalysisType())) {
            throw new BusinessException(
                    "Invalid analysis type: " + report.getAnalysisType() + ". Valid types: " + VALID_ANALYSIS_TYPES,
                    "INVALID_TYPE"
            );
        }
        if (report.getExecutiveSummary() == null || report.getExecutiveSummary().isBlank()) {
            throw new BusinessException("Executive summary is required.", "MISSING_SUMMARY");
        }
    }
}
