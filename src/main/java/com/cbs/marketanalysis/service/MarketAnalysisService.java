package com.cbs.marketanalysis.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketanalysis.entity.MarketAnalysisReport;
import com.cbs.marketanalysis.repository.MarketAnalysisReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketAnalysisService {

    private final MarketAnalysisReportRepository repository;

    @Transactional
    public MarketAnalysisReport create(MarketAnalysisReport report) {
        report.setReportCode("MAR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        // Ensure required non-nullable fields have defaults
        if (report.getAnalysisDate() == null) {
            report.setAnalysisDate(java.time.LocalDate.now());
        }
        if (report.getRegion() == null || report.getRegion().isBlank()) {
            report.setRegion("NIGERIA");
        }
        if (report.getStatus() == null || report.getStatus().isBlank()) {
            report.setStatus("DRAFT");
        }
        return repository.save(report);
    }

    @Transactional
    public MarketAnalysisReport publish(String reportCode) {
        MarketAnalysisReport report = getByCode(reportCode);
        if ("PUBLISHED".equals(report.getStatus())) {
            throw new BusinessException("Market analysis report " + reportCode + " is already published.");
        }
        // Allow publishing directly from DRAFT or REVIEWED
        report.setStatus("PUBLISHED");
        report.setPublishedAt(Instant.now());
        return repository.save(report);
    }

    public List<MarketAnalysisReport> getByType(String analysisType) {
        return repository.findByAnalysisTypeAndStatusOrderByAnalysisDateDesc(analysisType, "PUBLISHED");
    }

    public List<MarketAnalysisReport> getPublished() {
        return repository.findByStatusOrderByAnalysisDateDesc("PUBLISHED");
    }

    private MarketAnalysisReport getByCode(String code) {
        return repository.findByReportCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketAnalysisReport", "reportCode", code));
    }

    public java.util.List<MarketAnalysisReport> getAllReports() {
        return repository.findAll();
    }

}
