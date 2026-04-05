package com.cbs.marketanalysis.repository;

import com.cbs.marketanalysis.entity.MarketAnalysisReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MarketAnalysisReportRepository extends JpaRepository<MarketAnalysisReport, Long> {
    Optional<MarketAnalysisReport> findByReportCode(String reportCode);
    List<MarketAnalysisReport> findByAnalysisTypeAndStatusOrderByAnalysisDateDesc(String analysisType, String status);
    List<MarketAnalysisReport> findByStatusOrderByAnalysisDateDesc(String status);
    List<MarketAnalysisReport> findByAnalystContainingIgnoreCaseOrderByAnalysisDateDesc(String analyst);
    List<MarketAnalysisReport> findByRegionAndStatusOrderByAnalysisDateDesc(String region, String status);
    boolean existsByReportNameAndAnalysisType(String reportName, String analysisType);
}
