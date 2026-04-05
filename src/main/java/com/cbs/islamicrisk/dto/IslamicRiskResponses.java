package com.cbs.islamicrisk.dto;

import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class IslamicRiskResponses {

    private IslamicRiskResponses() {
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BacktestResult {
        private Long modelId;
        private String modelCode;
        private LocalDate from;
        private LocalDate to;
        private long sampleSize;
        private BigDecimal expectedDefaultRate;
        private BigDecimal actualDefaultRate;
        private BigDecimal accuracy;
        private BigDecimal giniCoefficient;
        private BigDecimal ksStatistic;
        private String summary;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreDistribution {
        private String contractTypeCode;
        private long totalAssessments;
        private BigDecimal averageScore;
        private Map<String, Long> distributionByBand;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EclBatchResult {
        private String contractTypeCode;
        private LocalDate calculationDate;
        private int contractsProcessed;
        private BigDecimal totalEcl;
        private BigDecimal totalExposure;
        private Map<String, BigDecimal> eclByStage;
        private Map<String, Long> countByStage;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EclPortfolioSummary {
        private LocalDate calculationDate;
        private BigDecimal totalEcl;
        private BigDecimal murabahaEcl;
        private BigDecimal ijarahEcl;
        private BigDecimal musharakahEcl;
        private Map<String, BigDecimal> exposureByStage;
        private Map<String, Long> countByStage;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EclMovementReport {
        private LocalDate from;
        private LocalDate to;
        private BigDecimal openingEcl;
        private BigDecimal additionalProvisions;
        private BigDecimal releases;
        private BigDecimal writeOffs;
        private BigDecimal closingEcl;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StageDistribution {
        private String contractTypeCode;
        private Map<String, Long> contractCountByStage;
        private Map<String, BigDecimal> exposureByStage;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CollateralCoverageResult {
        private Long contractId;
        private String contractTypeCode;
        private BigDecimal totalCollateralValue;
        private BigDecimal ead;
        private BigDecimal coverageRatio;
        private BigDecimal surplusOrShortfall;
        private Map<String, BigDecimal> byCollateralType;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CollateralPortfolioSummary {
        private long totalCollateralCount;
        private BigDecimal totalNetCollateralValue;
        private long prohibitedCount;
        private long reviewRequiredCount;
        private Map<String, BigDecimal> byType;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StageMigrationMatrix {
        private LocalDate from;
        private LocalDate to;
        private Map<String, Long> transitions;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskClassificationSummary {
        private LocalDate asOfDate;
        private Map<String, Long> byIfrs9Stage;
        private Map<String, Long> byAaoifiClassification;
        private Map<String, BigDecimal> exposureByIfrs9Stage;
        private Map<String, BigDecimal> exposureByAaoifiClassification;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IslamicCreditRiskDashboard {
        private LocalDate asOfDate;
        private PortfolioOverview portfolio;
        private Map<String, EclByType> eclByContractType;
        private AaoifiDistribution aaoifiDistribution;
        private StageMigrationSummary stageMigration;
        private MurabahaRiskView murabahaRisk;
        private IjarahRiskView ijarahRisk;
        private MusharakahRiskView musharakahRisk;
        private CollateralSummaryWidget collateral;
        private List<TopExposure> topExposures;
        private List<MonthlyRiskTrend> trend;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PortfolioOverview {
        private BigDecimal totalIslamicFinancing;
        private Map<String, BigDecimal> byContractType;
        private Map<String, Integer> contractCountByType;
        private BigDecimal totalEcl;
        private BigDecimal eclAsPercentOfPortfolio;
        private BigDecimal nplRatio;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EclByType {
        private BigDecimal totalExposure;
        private BigDecimal stage1Exposure;
        private BigDecimal stage2Exposure;
        private BigDecimal stage3Exposure;
        private BigDecimal stage1Ecl;
        private BigDecimal stage2Ecl;
        private BigDecimal stage3Ecl;
        private BigDecimal totalEcl;
        private BigDecimal coverageRatio;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AaoifiDistribution {
        private BigDecimal performingExposure;
        private long performingCount;
        private BigDecimal watchListExposure;
        private long watchListCount;
        private BigDecimal substandardExposure;
        private long substandardCount;
        private BigDecimal doubtfulExposure;
        private long doubtfulCount;
        private BigDecimal lossExposure;
        private long lossCount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StageMigrationSummary {
        private long stage1To2;
        private long stage1To3;
        private long stage2To1;
        private long stage2To3;
        private long stage3To1;
        private long stage3To2;
        private IslamicRiskDomainEnums.MigrationTrend migrationTrend;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MurabahaRiskView {
        private BigDecimal totalOutstanding;
        private BigDecimal totalDeferredProfit;
        private BigDecimal averageMarkupRate;
        private BigDecimal nplRatio;
        private Map<String, BigDecimal> concentrationByPurpose;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IjarahRiskView {
        private BigDecimal totalAssetNbv;
        private BigDecimal totalRentalReceivable;
        private BigDecimal averageAssetAge;
        private BigDecimal nplRatio;
        private Map<String, BigDecimal> assetCategoryDistribution;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MusharakahRiskView {
        private BigDecimal totalBankShare;
        private BigDecimal averageBankOwnership;
        private BigDecimal averageCustomerEquity;
        private BigDecimal nplRatio;
        private BigDecimal propertyValueTrend;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CollateralSummaryWidget {
        private BigDecimal totalCollateralValue;
        private BigDecimal totalExposure;
        private BigDecimal overallCoverageRatio;
        private Map<String, BigDecimal> byCollateralType;
        private int uncollateralizedContractCount;
        private BigDecimal uncollateralizedExposure;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopExposure {
        private String contractRef;
        private String contractType;
        private Long customerId;
        private BigDecimal outstanding;
        private IslamicRiskDomainEnums.Stage stage;
        private BigDecimal eclAmount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyRiskTrend {
        private String month;
        private BigDecimal totalExposure;
        private BigDecimal nplRatio;
        private BigDecimal totalEcl;
        private BigDecimal coverageRatio;
    }
}
