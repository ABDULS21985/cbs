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
        return repository.save(report);
    }

    @Transactional
    public MarketAnalysisReport publish(String reportCode) {
        MarketAnalysisReport report = getByCode(reportCode);
        if (!"REVIEWED".equals(report.getStatus())) {
            throw new BusinessException("Market analysis report " + reportCode + " must be REVIEWED to publish; current status: " + report.getStatus());
        }
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
