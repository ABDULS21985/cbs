package com.cbs.reports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * All report DTOs consolidated in one file for the /v1/reports/* endpoints.
 */
public final class ReportDTOs {

    private ReportDTOs() {}

    // ========================================================================
    // EXECUTIVE
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ExecutiveKpis {
        @Builder.Default private BigDecimal totalDeposits = BigDecimal.ZERO;
        @Builder.Default private BigDecimal totalLoans = BigDecimal.ZERO;
        @Builder.Default private long totalCustomers = 0;
        @Builder.Default private BigDecimal totalRevenue = BigDecimal.ZERO;
        @Builder.Default private BigDecimal nplRatio = BigDecimal.ZERO;
        @Builder.Default private BigDecimal costToIncomeRatio = BigDecimal.ZERO;
        // Period comparison fields
        private Double priorPeriodRevenue;
        private Double changePercent;
        private String changeDirection; // "UP", "DOWN", "FLAT"
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PnlSummary {
        @Builder.Default private BigDecimal currentRevenue = BigDecimal.ZERO;
        @Builder.Default private BigDecimal currentExpenses = BigDecimal.ZERO;
        @Builder.Default private BigDecimal currentNetProfit = BigDecimal.ZERO;
        @Builder.Default private BigDecimal priorRevenue = BigDecimal.ZERO;
        @Builder.Default private BigDecimal priorExpenses = BigDecimal.ZERO;
        @Builder.Default private BigDecimal priorNetProfit = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyPnlEntry {
        private String month;
        @Builder.Default private BigDecimal revenue = BigDecimal.ZERO;
        @Builder.Default private BigDecimal expenses = BigDecimal.ZERO;
        @Builder.Default private BigDecimal netProfit = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class KeyRatios {
        @Builder.Default private BigDecimal roa = BigDecimal.ZERO;
        @Builder.Default private BigDecimal roe = BigDecimal.ZERO;
        @Builder.Default private BigDecimal nim = BigDecimal.ZERO;
        @Builder.Default private BigDecimal costToIncome = BigDecimal.ZERO;
        @Builder.Default private BigDecimal car = BigDecimal.ZERO;
        @Builder.Default private BigDecimal ldr = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DepositLoanGrowthEntry {
        private String month;
        @Builder.Default private BigDecimal deposits = BigDecimal.ZERO;
        @Builder.Default private BigDecimal loans = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CustomerGrowthEntry {
        private String month;
        @Builder.Default private long newCustomers = 0;
        @Builder.Default private long closedCustomers = 0;
        @Builder.Default private long netGrowth = 0;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BranchPerformance {
        private String branchCode;
        private String branchName;
        @Builder.Default private BigDecimal revenue = BigDecimal.ZERO;
        @Builder.Default private BigDecimal deposits = BigDecimal.ZERO;
        @Builder.Default private BigDecimal loans = BigDecimal.ZERO;
    }

    // ========================================================================
    // FINANCIAL
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BalanceSheet {
        @Builder.Default private BigDecimal totalAssets = BigDecimal.ZERO;
        @Builder.Default private BigDecimal totalLiabilities = BigDecimal.ZERO;
        @Builder.Default private BigDecimal totalEquity = BigDecimal.ZERO;
        private List<GlCategoryEntry> assets;
        private List<GlCategoryEntry> liabilities;
        private List<GlCategoryEntry> equity;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GlCategoryEntry {
        private String glCode;
        private String glName;
        @Builder.Default private BigDecimal balance = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IncomeStatement {
        @Builder.Default private BigDecimal interestIncome = BigDecimal.ZERO;
        @Builder.Default private BigDecimal interestExpense = BigDecimal.ZERO;
        @Builder.Default private BigDecimal netInterestIncome = BigDecimal.ZERO;
        @Builder.Default private BigDecimal feeIncome = BigDecimal.ZERO;
        @Builder.Default private BigDecimal operatingExpenses = BigDecimal.ZERO;
        @Builder.Default private BigDecimal provisionCharge = BigDecimal.ZERO;
        @Builder.Default private BigDecimal profitBeforeTax = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CashFlowStatement {
        @Builder.Default private BigDecimal operatingActivities = BigDecimal.ZERO;
        @Builder.Default private BigDecimal investingActivities = BigDecimal.ZERO;
        @Builder.Default private BigDecimal financingActivities = BigDecimal.ZERO;
        @Builder.Default private BigDecimal netCashFlow = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CapitalAdequacy {
        @Builder.Default private BigDecimal tier1Capital = BigDecimal.ZERO;
        @Builder.Default private BigDecimal tier2Capital = BigDecimal.ZERO;
        @Builder.Default private BigDecimal totalCapital = BigDecimal.ZERO;
        @Builder.Default private BigDecimal riskWeightedAssets = BigDecimal.ZERO;
        @Builder.Default private BigDecimal capitalAdequacyRatio = BigDecimal.ZERO;
    }

    // ========================================================================
    // LOANS
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LoanStats {
        @Builder.Default private BigDecimal totalPortfolio = BigDecimal.ZERO;
        @Builder.Default private long activeCount = 0;
        @Builder.Default private BigDecimal nplAmount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal nplRatio = BigDecimal.ZERO;
        @Builder.Default private BigDecimal provisionCoverage = BigDecimal.ZERO;
        @Builder.Default private BigDecimal totalProvisions = BigDecimal.ZERO;
        // Period comparison fields
        private Double priorPeriodValue;
        private Double changePercent;
        private String changeDirection; // "UP", "DOWN", "FLAT"
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductMixEntry {
        private String productName;
        private String productCode;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SectorExposureEntry {
        private String sector;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal exposure = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DpdBucket {
        private String bucket;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NplTrendEntry {
        private String month;
        @Builder.Default private BigDecimal nplRatio = BigDecimal.ZERO;
        @Builder.Default private BigDecimal nplAmount = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProvisionWaterfall {
        @Builder.Default private BigDecimal opening = BigDecimal.ZERO;
        @Builder.Default private BigDecimal charge = BigDecimal.ZERO;
        @Builder.Default private BigDecimal release = BigDecimal.ZERO;
        @Builder.Default private BigDecimal writeOff = BigDecimal.ZERO;
        @Builder.Default private BigDecimal closing = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopObligor {
        private String customerName;
        private String cifNumber;
        @Builder.Default private BigDecimal exposure = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
        private String delinquencyBucket;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VintageEntry {
        private String cohort;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal disbursedAmount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal outstandingAmount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal nplRate = BigDecimal.ZERO;
    }

    // ========================================================================
    // DEPOSITS
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DepositStats {
        @Builder.Default private BigDecimal totalDeposits = BigDecimal.ZERO;
        @Builder.Default private long accountCount = 0;
        @Builder.Default private BigDecimal averageBalance = BigDecimal.ZERO;
        @Builder.Default private BigDecimal concentrationRatio = BigDecimal.ZERO;
        // Period comparison fields
        private Double priorPeriodValue;
        private Double changePercent;
        private String changeDirection; // "UP", "DOWN", "FLAT"
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DepositMixEntry {
        private String productType;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DepositGrowthEntry {
        private String month;
        @Builder.Default private BigDecimal totalDeposits = BigDecimal.ZERO;
        @Builder.Default private BigDecimal growthAmount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal growthPercent = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MaturityBucket {
        private String bucket;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CostOfFundsEntry {
        private String productType;
        @Builder.Default private BigDecimal balance = BigDecimal.ZERO;
        @Builder.Default private BigDecimal weightedAvgRate = BigDecimal.ZERO;
        @Builder.Default private BigDecimal interestCost = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopDepositor {
        private String customerName;
        private String cifNumber;
        @Builder.Default private BigDecimal totalDeposits = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RateBandEntry {
        private String rateBand;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RateSensitivityEntry {
        private String bucket;
        @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal cumulativeGap = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RetentionVintageEntry {
        private String cohort;
        @Builder.Default private long opened = 0;
        @Builder.Default private long active = 0;
        @Builder.Default private BigDecimal retentionRate = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DepositChurnEntry {
        private String month;
        @Builder.Default private long closed = 0;
        @Builder.Default private BigDecimal closedAmount = BigDecimal.ZERO;
    }

    // ========================================================================
    // PAYMENTS
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PaymentStats {
        @Builder.Default private long totalVolume = 0;
        @Builder.Default private BigDecimal totalValue = BigDecimal.ZERO;
        @Builder.Default private BigDecimal successRate = BigDecimal.ZERO;
        @Builder.Default private BigDecimal avgTransaction = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PaymentVolumeTrendEntry {
        private String month;
        @Builder.Default private long volume = 0;
        @Builder.Default private BigDecimal value = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelBreakdownEntry {
        private String channel;
        @Builder.Default private long volume = 0;
        @Builder.Default private BigDecimal value = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PaymentRailEntry {
        private String rail;
        @Builder.Default private long volume = 0;
        @Builder.Default private BigDecimal value = BigDecimal.ZERO;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PaymentFailureEntry {
        private String reason;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReconciliationSummary {
        @Builder.Default private long totalTransactions = 0;
        @Builder.Default private long matched = 0;
        @Builder.Default private long unmatched = 0;
        @Builder.Default private BigDecimal matchRate = BigDecimal.ZERO;
    }

    // ========================================================================
    // CUSTOMERS
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CustomerStats {
        @Builder.Default private long total = 0;
        @Builder.Default private long active = 0;
        @Builder.Default private long dormant = 0;
        @Builder.Default private long newMtd = 0;
        @Builder.Default private long closedMtd = 0;
        // Period comparison fields
        private Double priorPeriodValue;
        private Double changePercent;
        private String changeDirection; // "UP", "DOWN", "FLAT"
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CustomerGrowthTrendEntry {
        private String month;
        @Builder.Default private long totalCustomers = 0;
        @Builder.Default private long newCustomers = 0;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CustomerSegmentEntry {
        private String segment;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LifecycleStageEntry {
        private String stage;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductPenetrationEntry {
        private int productsHeld;
        @Builder.Default private long customerCount = 0;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LtvBucket {
        private String bucket;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal totalLtv = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CustomerChurnEntry {
        private String month;
        @Builder.Default private long churned = 0;
        @Builder.Default private BigDecimal churnRate = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CrossSellOpportunity {
        private String product;
        @Builder.Default private long eligibleCount = 0;
        @Builder.Default private BigDecimal estimatedRevenue = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class FunnelStage {
        private String stage;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal conversionRate = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AtRiskCustomer {
        private String cifNumber;
        private String customerName;
        @Builder.Default private BigDecimal riskScore = BigDecimal.ZERO;
        private String reason;
    }

    // ========================================================================
    // CHANNELS
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelStats {
        private String channel;
        @Builder.Default private long sessions = 0;
        @Builder.Default private long transactions = 0;
        @Builder.Default private long uniqueUsers = 0;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelVolumeEntry {
        private String channel;
        @Builder.Default private long volume = 0;
        @Builder.Default private BigDecimal value = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelMixTrendEntry {
        private String month;
        private List<ChannelShare> channels;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelShare {
        private String channel;
        @Builder.Default private BigDecimal percentage = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelSuccessRateEntry {
        private String channel;
        @Builder.Default private long total = 0;
        @Builder.Default private long successful = 0;
        @Builder.Default private BigDecimal successRate = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelSuccessTrendEntry {
        private String month;
        private String channel;
        @Builder.Default private BigDecimal successRate = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DigitalAdoption {
        @Builder.Default private BigDecimal digitalPercent = BigDecimal.ZERO;
        @Builder.Default private BigDecimal branchPercent = BigDecimal.ZERO;
        @Builder.Default private long digitalTransactions = 0;
        @Builder.Default private long branchTransactions = 0;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelMigrationEntry {
        private String month;
        @Builder.Default private long migratedCustomers = 0;
        @Builder.Default private BigDecimal migrationRate = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChannelTransactionTypeEntry {
        private String channel;
        private String transactionType;
        @Builder.Default private long count = 0;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class HeatmapCell {
        private int hour;
        private int dayOfWeek;
        @Builder.Default private long count = 0;
    }

    // ========================================================================
    // TREASURY
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LiquidityReport {
        @Builder.Default private BigDecimal lcr = BigDecimal.ZERO;
        @Builder.Default private BigDecimal nsfr = BigDecimal.ZERO;
        @Builder.Default private BigDecimal liquidityBuffer = BigDecimal.ZERO;
        @Builder.Default private BigDecimal totalHqla = BigDecimal.ZERO;
        @Builder.Default private BigDecimal netCashOutflow = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DurationAnalysisEntry {
        private String instrument;
        @Builder.Default private BigDecimal amount = BigDecimal.ZERO;
        @Builder.Default private BigDecimal duration = BigDecimal.ZERO;
        @Builder.Default private BigDecimal modifiedDuration = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DurationTrendEntry {
        private String month;
        @Builder.Default private BigDecimal assetDuration = BigDecimal.ZERO;
        @Builder.Default private BigDecimal liabilityDuration = BigDecimal.ZERO;
        @Builder.Default private BigDecimal durationGap = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class FxExposureEntry {
        private String currency;
        @Builder.Default private BigDecimal longPosition = BigDecimal.ZERO;
        @Builder.Default private BigDecimal shortPosition = BigDecimal.ZERO;
        @Builder.Default private BigDecimal netPosition = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GapAnalysisEntry {
        private String timeBucket;
        @Builder.Default private BigDecimal rateAssets = BigDecimal.ZERO;
        @Builder.Default private BigDecimal rateLiabilities = BigDecimal.ZERO;
        @Builder.Default private BigDecimal gap = BigDecimal.ZERO;
        @Builder.Default private BigDecimal cumulativeGap = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NiiSensitivity {
        @Builder.Default private BigDecimal currentNii = BigDecimal.ZERO;
        private List<NiiScenario> scenarios;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NiiScenario {
        private String scenario;
        @Builder.Default private int basisPointShift = 0;
        @Builder.Default private BigDecimal niiImpact = BigDecimal.ZERO;
        @Builder.Default private BigDecimal niiAfterShock = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RateOutlook {
        @Builder.Default private BigDecimal currentPolicyRate = BigDecimal.ZERO;
        @Builder.Default private BigDecimal inflationRate = BigDecimal.ZERO;
        @Builder.Default private BigDecimal avgLendingRate = BigDecimal.ZERO;
        @Builder.Default private BigDecimal avgDepositRate = BigDecimal.ZERO;
        @Builder.Default private BigDecimal spread = BigDecimal.ZERO;
    }

    // ========================================================================
    // OPERATIONS
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OperationsStats {
        @Builder.Default private long transactionVolume = 0;
        @Builder.Default private BigDecimal avgProcessingTimeMs = BigDecimal.ZERO;
        @Builder.Default private BigDecimal slaCompliancePercent = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SlaEntry {
        private String serviceType;
        @Builder.Default private long totalCases = 0;
        @Builder.Default private long withinSla = 0;
        @Builder.Default private BigDecimal slaPercent = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SlaTrendEntry {
        private String month;
        @Builder.Default private BigDecimal slaPercent = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EfficiencyTrendEntry {
        private String month;
        @Builder.Default private BigDecimal avgProcessingTimeMs = BigDecimal.ZERO;
        @Builder.Default private BigDecimal throughput = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QueueMetrics {
        private String queueName;
        @Builder.Default private long depth = 0;
        @Builder.Default private BigDecimal avgWaitTimeMs = BigDecimal.ZERO;
        @Builder.Default private BigDecimal avgProcessingTimeMs = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StaffProductivity {
        private String staffId;
        private String staffName;
        @Builder.Default private long transactionsProcessed = 0;
        @Builder.Default private BigDecimal avgTimePerTransaction = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UptimeReport {
        private String system;
        @Builder.Default private BigDecimal uptimePercent = BigDecimal.ZERO;
        @Builder.Default private int incidentCount = 0;
        @Builder.Default private BigDecimal mttr = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IncidentSummary {
        @Builder.Default private long totalIncidents = 0;
        @Builder.Default private long critical = 0;
        @Builder.Default private long major = 0;
        @Builder.Default private long minor = 0;
        @Builder.Default private BigDecimal avgResolutionTimeHours = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AutomationMetrics {
        @Builder.Default private BigDecimal automationRate = BigDecimal.ZERO;
        @Builder.Default private long automatedTransactions = 0;
        @Builder.Default private long manualInterventions = 0;
        @Builder.Default private BigDecimal straightThroughPercent = BigDecimal.ZERO;
    }

    // ========================================================================
    // MARKETING
    // ========================================================================

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MarketingStats {
        @Builder.Default private long totalCampaigns = 0;
        @Builder.Default private long totalLeads = 0;
        @Builder.Default private long totalConversions = 0;
        @Builder.Default private Integer npsScore = 0;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CampaignPerformance {
        private String campaignCode;
        private String campaignName;
        private String status;
        @Builder.Default private int sentCount = 0;
        @Builder.Default private int deliveredCount = 0;
        @Builder.Default private int openedCount = 0;
        @Builder.Default private int clickedCount = 0;
        @Builder.Default private int convertedCount = 0;
        @Builder.Default private BigDecimal revenueGenerated = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SurveyStats {
        private String surveyCode;
        private String surveyName;
        @Builder.Default private int totalSent = 0;
        @Builder.Default private int totalResponses = 0;
        @Builder.Default private BigDecimal responseRate = BigDecimal.ZERO;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NpsTrendEntry {
        private String month;
        @Builder.Default private Integer npsScore = 0;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LeadFunnelStage {
        private String stage;
        @Builder.Default private long count = 0;
        @Builder.Default private BigDecimal conversionRate = BigDecimal.ZERO;
    }
}
