package com.cbs.reports.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.reports.dto.ReportDTOs.*;
import com.cbs.reports.service.ReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
public class ReportsController {

    private final ReportsService reportsService;

    // ========================================================================
    // EXECUTIVE REPORTS — /v1/reports/executive/*
    // ========================================================================

    @GetMapping("/executive/kpis")
    public ResponseEntity<ApiResponse<ExecutiveKpis>> getExecutiveKpis() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getExecutiveKpis()));
    }

    @GetMapping("/executive/pnl-summary")
    public ResponseEntity<ApiResponse<PnlSummary>> getPnlSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getPnlSummary(from, to)));
    }

    @GetMapping("/executive/monthly-pnl")
    public ResponseEntity<ApiResponse<List<MonthlyPnlEntry>>> getMonthlyPnl(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getMonthlyPnl(from, to)));
    }

    @GetMapping("/executive/key-ratios")
    public ResponseEntity<ApiResponse<KeyRatios>> getKeyRatios() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getKeyRatios()));
    }

    @GetMapping("/executive/deposit-loan-growth")
    public ResponseEntity<ApiResponse<List<DepositLoanGrowthEntry>>> getDepositLoanGrowth(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositLoanGrowth(from, to)));
    }

    @GetMapping("/executive/customer-growth")
    public ResponseEntity<ApiResponse<List<CustomerGrowthEntry>>> getCustomerGrowth(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerGrowth(from, to)));
    }

    @GetMapping("/executive/top-branches")
    public ResponseEntity<ApiResponse<List<BranchPerformance>>> getTopBranches() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getTopBranches()));
    }

    // ========================================================================
    // FINANCIAL REPORTS — /v1/reports/financial/*
    // ========================================================================

    @GetMapping("/financial/balance-sheet")
    public ResponseEntity<ApiResponse<BalanceSheet>> getBalanceSheet(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getBalanceSheet(asOf)));
    }

    @GetMapping("/financial/income-statement")
    public ResponseEntity<ApiResponse<IncomeStatement>> getIncomeStatement(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getIncomeStatement(from, to)));
    }

    @GetMapping("/financial/cash-flow")
    public ResponseEntity<ApiResponse<CashFlowStatement>> getCashFlow(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCashFlow(from, to)));
    }

    @GetMapping("/financial/capital-adequacy")
    public ResponseEntity<ApiResponse<CapitalAdequacy>> getCapitalAdequacy() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCapitalAdequacy()));
    }

    // ========================================================================
    // LOAN REPORTS — /v1/reports/loans/*
    // ========================================================================

    @GetMapping("/loans/stats")
    public ResponseEntity<ApiResponse<LoanStats>> getLoanStats() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLoanStats()));
    }

    @GetMapping("/loans/product-mix")
    public ResponseEntity<ApiResponse<List<ProductMixEntry>>> getLoanProductMix() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLoanProductMix()));
    }

    @GetMapping("/loans/sector-exposure")
    public ResponseEntity<ApiResponse<List<SectorExposureEntry>>> getLoanSectorExposure() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLoanSectorExposure()));
    }

    @GetMapping("/loans/dpd-buckets")
    public ResponseEntity<ApiResponse<List<DpdBucket>>> getDpdBuckets() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDpdBuckets()));
    }

    @GetMapping("/loans/npl-trend")
    public ResponseEntity<ApiResponse<List<NplTrendEntry>>> getNplTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getNplTrend(from, to)));
    }

    @GetMapping("/loans/provision-waterfall")
    public ResponseEntity<ApiResponse<ProvisionWaterfall>> getProvisionWaterfall(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getProvisionWaterfall(from, to)));
    }

    @GetMapping("/loans/top-obligors")
    public ResponseEntity<ApiResponse<List<TopObligor>>> getTopObligors() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getTopObligors()));
    }

    @GetMapping("/loans/vintage")
    public ResponseEntity<ApiResponse<List<VintageEntry>>> getLoanVintage() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLoanVintage()));
    }

    // ========================================================================
    // DEPOSIT REPORTS — /v1/reports/deposits/*
    // ========================================================================

    @GetMapping("/deposits/stats")
    public ResponseEntity<ApiResponse<DepositStats>> getDepositStats() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositStats()));
    }

    @GetMapping("/deposits/mix")
    public ResponseEntity<ApiResponse<List<DepositMixEntry>>> getDepositMix() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositMix()));
    }

    @GetMapping("/deposits/growth-trend")
    public ResponseEntity<ApiResponse<List<DepositGrowthEntry>>> getDepositGrowthTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositGrowthTrend(from, to)));
    }

    @GetMapping("/deposits/maturity-profile")
    public ResponseEntity<ApiResponse<List<MaturityBucket>>> getDepositMaturityProfile() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositMaturityProfile()));
    }

    @GetMapping("/deposits/cost-of-funds")
    public ResponseEntity<ApiResponse<List<CostOfFundsEntry>>> getCostOfFunds() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCostOfFunds()));
    }

    @GetMapping("/deposits/top-depositors")
    public ResponseEntity<ApiResponse<List<TopDepositor>>> getTopDepositors() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getTopDepositors()));
    }

    @GetMapping("/deposits/rate-bands")
    public ResponseEntity<ApiResponse<List<RateBandEntry>>> getDepositRateBands() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositRateBands()));
    }

    @GetMapping("/deposits/rate-sensitivity")
    public ResponseEntity<ApiResponse<List<RateSensitivityEntry>>> getDepositRateSensitivity() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositRateSensitivity()));
    }

    @GetMapping("/deposits/retention-vintage")
    public ResponseEntity<ApiResponse<List<RetentionVintageEntry>>> getDepositRetentionVintage() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositRetentionVintage()));
    }

    @GetMapping("/deposits/churn")
    public ResponseEntity<ApiResponse<List<DepositChurnEntry>>> getDepositChurn(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositChurn(from, to)));
    }

    // ========================================================================
    // PAYMENT REPORTS — /v1/reports/payments/*
    // ========================================================================

    @GetMapping("/payments/stats")
    public ResponseEntity<ApiResponse<PaymentStats>> getPaymentStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getPaymentStats(from, to)));
    }

    @GetMapping("/payments/volume-trend")
    public ResponseEntity<ApiResponse<List<PaymentVolumeTrendEntry>>> getPaymentVolumeTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getPaymentVolumeTrend(from, to)));
    }

    @GetMapping("/payments/channel-breakdown")
    public ResponseEntity<ApiResponse<List<ChannelBreakdownEntry>>> getPaymentChannelBreakdown(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getPaymentChannelBreakdown(from, to)));
    }

    @GetMapping("/payments/rails")
    public ResponseEntity<ApiResponse<List<PaymentRailEntry>>> getPaymentRails(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getPaymentRails(from, to)));
    }

    @GetMapping("/payments/failures")
    public ResponseEntity<ApiResponse<List<PaymentFailureEntry>>> getPaymentFailures(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getPaymentFailures(from, to)));
    }

    @GetMapping("/payments/reconciliation")
    public ResponseEntity<ApiResponse<ReconciliationSummary>> getReconciliation(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getReconciliation(from, to)));
    }

    // ========================================================================
    // CUSTOMER REPORTS — /v1/reports/customers/*
    // ========================================================================

    @GetMapping("/customers/stats")
    public ResponseEntity<ApiResponse<CustomerStats>> getCustomerStats() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerStats()));
    }

    @GetMapping("/customers/growth-trend")
    public ResponseEntity<ApiResponse<List<CustomerGrowthTrendEntry>>> getCustomerGrowthTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerGrowthTrend(from, to)));
    }

    @GetMapping("/customers/segments")
    public ResponseEntity<ApiResponse<List<CustomerSegmentEntry>>> getCustomerSegments() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerSegments()));
    }

    @GetMapping("/customers/lifecycle")
    public ResponseEntity<ApiResponse<List<LifecycleStageEntry>>> getCustomerLifecycle() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerLifecycle()));
    }

    @GetMapping("/customers/product-penetration")
    public ResponseEntity<ApiResponse<List<ProductPenetrationEntry>>> getProductPenetration() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getProductPenetration()));
    }

    @GetMapping("/customers/ltv")
    public ResponseEntity<ApiResponse<List<LtvBucket>>> getCustomerLtv() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerLtv()));
    }

    @GetMapping("/customers/churn")
    public ResponseEntity<ApiResponse<List<CustomerChurnEntry>>> getCustomerChurn(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerChurn(from, to)));
    }

    @GetMapping("/customers/cross-sell")
    public ResponseEntity<ApiResponse<List<CrossSellOpportunity>>> getCrossSellOpportunities() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCrossSellOpportunities()));
    }

    @GetMapping("/customers/funnel")
    public ResponseEntity<ApiResponse<List<FunnelStage>>> getOnboardingFunnel() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getOnboardingFunnel()));
    }

    @GetMapping("/customers/at-risk")
    public ResponseEntity<ApiResponse<List<AtRiskCustomer>>> getAtRiskCustomers() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getAtRiskCustomers()));
    }

    // ========================================================================
    // CHANNEL REPORTS — /v1/reports/channels/*
    // ========================================================================

    @GetMapping("/channels/stats")
    public ResponseEntity<ApiResponse<List<ChannelStats>>> getChannelStats() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelStats()));
    }

    @GetMapping("/channels/volumes")
    public ResponseEntity<ApiResponse<List<ChannelVolumeEntry>>> getChannelVolumes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelVolumes(from, to)));
    }

    @GetMapping("/channels/mix-trend")
    public ResponseEntity<ApiResponse<List<ChannelMixTrendEntry>>> getChannelMixTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelMixTrend(from, to)));
    }

    @GetMapping("/channels/success-rates")
    public ResponseEntity<ApiResponse<List<ChannelSuccessRateEntry>>> getChannelSuccessRates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelSuccessRates(from, to)));
    }

    @GetMapping("/channels/success-trend")
    public ResponseEntity<ApiResponse<List<ChannelSuccessTrendEntry>>> getChannelSuccessTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelSuccessTrend(from, to)));
    }

    @GetMapping("/channels/digital-adoption")
    public ResponseEntity<ApiResponse<DigitalAdoption>> getDigitalAdoption(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDigitalAdoption(from, to)));
    }

    @GetMapping("/channels/migration")
    public ResponseEntity<ApiResponse<List<ChannelMigrationEntry>>> getChannelMigration(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelMigration(from, to)));
    }

    @GetMapping("/channels/transaction-types")
    public ResponseEntity<ApiResponse<List<ChannelTransactionTypeEntry>>> getChannelTransactionTypes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelTransactionTypes(from, to)));
    }

    @GetMapping("/channels/heatmap")
    public ResponseEntity<ApiResponse<List<HeatmapCell>>> getChannelHeatmap(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getChannelHeatmap(from, to)));
    }

    // ========================================================================
    // TREASURY REPORTS — /v1/reports/treasury/*
    // ========================================================================

    @GetMapping("/treasury/liquidity")
    public ResponseEntity<ApiResponse<LiquidityReport>> getLiquidity() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLiquidity()));
    }

    @GetMapping("/treasury/duration")
    public ResponseEntity<ApiResponse<List<DurationAnalysisEntry>>> getDurationAnalysis() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDurationAnalysis()));
    }

    @GetMapping("/treasury/duration-trend")
    public ResponseEntity<ApiResponse<List<DurationTrendEntry>>> getDurationTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDurationTrend(from, to)));
    }

    @GetMapping("/treasury/fx-exposure")
    public ResponseEntity<ApiResponse<List<FxExposureEntry>>> getFxExposure() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getFxExposure()));
    }

    @GetMapping("/treasury/gap-analysis")
    public ResponseEntity<ApiResponse<List<GapAnalysisEntry>>> getGapAnalysis() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getGapAnalysis()));
    }

    @GetMapping("/treasury/nii-sensitivity")
    public ResponseEntity<ApiResponse<NiiSensitivity>> getNiiSensitivity() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getNiiSensitivity()));
    }

    @GetMapping("/treasury/rate-outlook")
    public ResponseEntity<ApiResponse<RateOutlook>> getRateOutlook() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getRateOutlook()));
    }

    // ========================================================================
    // OPERATIONS REPORTS — /v1/reports/operations/*
    // ========================================================================

    @GetMapping("/operations/stats")
    public ResponseEntity<ApiResponse<OperationsStats>> getOperationsStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getOperationsStats(from, to)));
    }

    @GetMapping("/operations/sla")
    public ResponseEntity<ApiResponse<List<SlaEntry>>> getSlaByServiceType() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getSlaByServiceType()));
    }

    @GetMapping("/operations/sla-trend")
    public ResponseEntity<ApiResponse<List<SlaTrendEntry>>> getSlaTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getSlaTrend(from, to)));
    }

    @GetMapping("/operations/efficiency-trend")
    public ResponseEntity<ApiResponse<List<EfficiencyTrendEntry>>> getEfficiencyTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getEfficiencyTrend(from, to)));
    }

    @GetMapping("/operations/queue")
    public ResponseEntity<ApiResponse<List<QueueMetrics>>> getQueueMetrics() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getQueueMetrics()));
    }

    @GetMapping("/operations/staff")
    public ResponseEntity<ApiResponse<List<StaffProductivity>>> getStaffProductivity() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getStaffProductivity()));
    }

    @GetMapping("/operations/uptime")
    public ResponseEntity<ApiResponse<List<UptimeReport>>> getUptimeReport() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getUptimeReport()));
    }

    @GetMapping("/operations/incidents")
    public ResponseEntity<ApiResponse<IncidentSummary>> getIncidentSummary() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getIncidentSummary()));
    }

    @GetMapping("/operations/automation")
    public ResponseEntity<ApiResponse<AutomationMetrics>> getAutomationMetrics() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getAutomationMetrics()));
    }

    // ========================================================================
    // MARKETING REPORTS — /v1/reports/marketing/*
    // ========================================================================

    @GetMapping("/marketing/stats")
    public ResponseEntity<ApiResponse<MarketingStats>> getMarketingStats() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getMarketingStats()));
    }

    @GetMapping("/marketing/campaigns")
    public ResponseEntity<ApiResponse<List<CampaignPerformance>>> getCampaignPerformance() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCampaignPerformance()));
    }

    @GetMapping("/marketing/surveys")
    public ResponseEntity<ApiResponse<List<SurveyStats>>> getSurveyStats() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getSurveyStats()));
    }

    @GetMapping("/marketing/nps-trend")
    public ResponseEntity<ApiResponse<List<NpsTrendEntry>>> getNpsTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getNpsTrend(from, to)));
    }

    @GetMapping("/marketing/lead-funnel")
    public ResponseEntity<ApiResponse<List<LeadFunnelStage>>> getLeadFunnel() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLeadFunnel()));
    }
}
