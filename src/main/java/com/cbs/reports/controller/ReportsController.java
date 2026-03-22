package com.cbs.reports.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.reports.dto.ReportDTOs.*;
import com.cbs.reports.entity.CustomReport;
import com.cbs.reports.entity.ReportExecution;
import com.cbs.reports.service.ReportExecutionService;
import com.cbs.reports.service.ReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
public class ReportsController {

    private final ReportsService reportsService;
    private final ReportExecutionService reportExecutionService;

    // ========================================================================
    // EXECUTIVE REPORTS — /v1/reports/executive/*
    // ========================================================================

    @GetMapping("/executive/kpis")
    public ResponseEntity<ApiResponse<ExecutiveKpis>> getExecutiveKpis(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getExecutiveKpis(from, to)));
    }

    @GetMapping("/executive/pnl-summary")
    public ResponseEntity<ApiResponse<PnlSummaryV2>> getPnlSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getPnlSummary(from, to)));
    }

    @GetMapping("/executive/monthly-pnl")
    public ResponseEntity<ApiResponse<List<MonthlyPnlEntryV2>>> getMonthlyPnl(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getMonthlyPnl(from, to)));
    }

    @GetMapping("/executive/key-ratios")
    public ResponseEntity<ApiResponse<KeyRatios>> getKeyRatios() {
        // Returns the raw KeyRatios object; the frontend executiveReportApi.ts
        // transforms this into the KeyRatio[] array with display metadata.
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getKeyRatios()));
    }

    @GetMapping("/executive/deposit-loan-growth")
    public ResponseEntity<ApiResponse<List<DepositLoanGrowthEntry>>> getDepositLoanGrowth(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositLoanGrowth(from, to)));
    }

    @GetMapping("/executive/customer-growth")
    public ResponseEntity<ApiResponse<List<CustomerGrowthEntryV2>>> getCustomerGrowth(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getCustomerGrowth(from, to)));
    }

    @GetMapping("/executive/top-branches")
    public ResponseEntity<ApiResponse<List<BranchPerformanceV2>>> getTopBranches() {
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

    @GetMapping("/financial/export/excel")
    public ResponseEntity<byte[]> exportFinancialExcel(
            @RequestParam String reportType,
            @RequestParam(required = false) String asOf,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        byte[] data = reportsService.exportFinancialExcel(reportType, asOf, from, to);
        String filename = "financial-" + reportType + "-" + LocalDate.now() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/financial/export/pdf")
    public ResponseEntity<byte[]> exportFinancialPdf(
            @RequestParam String reportType,
            @RequestParam(required = false) String asOf,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        byte[] data = reportsService.exportFinancialPdf(reportType, asOf, from, to);
        String filename = "financial-" + reportType + "-" + LocalDate.now() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
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

    @GetMapping("/loans/dpd-matrix")
    public ResponseEntity<ApiResponse<List<DpdMatrixRow>>> getLoanDpdMatrix() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLoanDpdMatrix()));
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

    @GetMapping("/loans/vintage-matrix")
    public ResponseEntity<ApiResponse<List<VintageCellEntry>>> getLoanVintageMatrix() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLoanVintageMatrix()));
    }

    @GetMapping("/loans/geographic-concentration")
    public ResponseEntity<ApiResponse<List<GeographicExposureEntry>>> getLoanGeographicConcentration() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getLoanGeographicConcentration()));
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

    @GetMapping("/deposits/segment-distribution")
    public ResponseEntity<ApiResponse<List<DepositSegmentEntry>>> getDepositSegmentDistribution() {
        return ResponseEntity.ok(ApiResponse.ok(reportsService.getDepositSegmentDistribution()));
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

    @GetMapping(value = "/payments/live-feed", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter liveFeed() {
        SseEmitter emitter = new SseEmitter(300_000L); // 5 minute timeout
        var executor = java.util.concurrent.Executors.newSingleThreadScheduledExecutor();
        executor.scheduleAtFixedRate(() -> {
            try {
                var txn = reportsService.generateLiveTransaction();
                emitter.send(SseEmitter.event()
                        .name("transaction")
                        .data(txn));
            } catch (Exception e) {
                emitter.completeWithError(e);
                executor.shutdown();
            }
        }, 0, 5, java.util.concurrent.TimeUnit.SECONDS);
        emitter.onCompletion(executor::shutdown);
        emitter.onTimeout(executor::shutdown);
        emitter.onError(t -> executor.shutdown());
        return emitter;
    }

    // ========================================================================
    // CUSTOM REPORTS — /v1/reports/custom/*
    // These CRUD endpoints were previously missing; the service had the logic
    // but no controller was wiring the HTTP endpoints.
    // ========================================================================

    /** GET /v1/reports/custom?owner=mine|shared|all */
    @GetMapping("/custom")
    public ResponseEntity<ApiResponse<List<CustomReportDto>>> listCustomReports(
            @RequestParam(required = false, defaultValue = "mine") String owner,
            Authentication auth) {
        List<CustomReport> reports;
        if ("shared".equalsIgnoreCase(owner)) {
            reports = reportExecutionService.getShared();
        } else if ("all".equalsIgnoreCase(owner)) {
            reports = reportExecutionService.getAll();
        } else {
            reports = reportExecutionService.getByOwner(auth.getName());
        }
        // Filter out soft-deleted reports
        List<CustomReportDto> dtos = reports.stream()
                .filter(r -> !"DELETED".equals(r.getStatus()))
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    /** GET /v1/reports/custom/mine */
    @GetMapping("/custom/mine")
    public ResponseEntity<ApiResponse<List<CustomReportDto>>> getMyReports(Authentication auth) {
        List<CustomReportDto> dtos = reportExecutionService.getByOwner(auth.getName()).stream()
                .filter(r -> !"DELETED".equals(r.getStatus()))
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    /** GET /v1/reports/custom/data-sources */
    @GetMapping("/custom/data-sources")
    public ResponseEntity<ApiResponse<List<DataSourceDto>>> getDataSources() {
        return ResponseEntity.ok(ApiResponse.ok(buildDataSources()));
    }

    /** GET /v1/reports/custom/{id} */
    @GetMapping("/custom/{id}")
    public ResponseEntity<ApiResponse<CustomReportDto>> getCustomReport(@PathVariable Long id) {
        return reportExecutionService.getById(id)
                .filter(r -> !"DELETED".equals(r.getStatus()))
                .map(r -> ResponseEntity.ok(ApiResponse.ok(toDto(r))))
                .orElse(ResponseEntity.notFound().build());
    }

    /** POST /v1/reports/custom/save — creates or updates a custom report */
    @PostMapping("/custom/save")
    public ResponseEntity<ApiResponse<CustomReportDto>> saveCustomReport(
            @RequestBody SaveReportRequest req,
            Authentication auth) {

        CustomReport report;
        if (req.getId() != null && !req.getId().isBlank()) {
            Long id = Long.parseLong(req.getId());
            report = reportExecutionService.getById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));
        } else {
            report = new CustomReport();
            report.setOwner(auth.getName());
            report.setCreatedAt(Instant.now());
        }

        report.setReportName(req.getName() != null ? req.getName() : "Untitled Report");
        report.setDescription(req.getDescription());
        report.setCategory(req.getCategory());
        report.setConfig(req.getConfig());
        report.setAccessLevel(mapSavedToToAccessLevel(req.getSavedTo()));
        report.setStatus("ACTIVE");

        // Persist schedule as a map
        if (req.getSchedule() != null) {
            Map<String, Object> scheduleMap = new LinkedHashMap<>();
            scheduleMap.put("frequency", req.getSchedule());
            if (req.getScheduleTime() != null) scheduleMap.put("time", req.getScheduleTime());
            if (req.getScheduleDay() != null) scheduleMap.put("day", req.getScheduleDay());
            if (req.getExportFormat() != null) scheduleMap.put("format", req.getExportFormat());
            if (req.getDeliveryEmails() != null) scheduleMap.put("recipients", req.getDeliveryEmails());
            report.setSchedule(scheduleMap);
        }
        if (req.getDeliveryEmails() != null) {
            report.setRecipients(req.getDeliveryEmails());
        }

        CustomReport saved = reportExecutionService.save(report);
        return ResponseEntity.ok(ApiResponse.ok(toDto(saved)));
    }

    /** DELETE /v1/reports/custom/{id} */
    @DeleteMapping("/custom/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomReport(@PathVariable Long id) {
        reportExecutionService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** POST /v1/reports/custom/{id}/run */
    @PostMapping("/custom/{id}/run")
    public ResponseEntity<ApiResponse<ReportRunResult>> runCustomReport(@PathVariable Long id) {
        Map<String, Object> result = reportExecutionService.run(id);
        ReportRunResult dto = ReportRunResult.builder()
                .reportId(String.valueOf(result.get("reportId")))
                .runAt(String.valueOf(result.get("runAt")))
                .rowCount(((Number) result.get("rowCount")).intValue())
                .columns(castToListOfMaps(result.get("columns")))
                .rows(castToListOfMaps(result.get("rows")))
                .executionId(((Number) result.get("executionId")).longValue())
                .durationMs(((Number) result.get("durationMs")).intValue())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    /** GET /v1/reports/custom/{id}/history */
    @GetMapping("/custom/{id}/history")
    public ResponseEntity<ApiResponse<List<ReportExecution>>> getRunHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(reportExecutionService.getHistory(id)));
    }

    /** POST /v1/reports/custom/{id}/schedule */
    @PostMapping("/custom/{id}/schedule")
    public ResponseEntity<ApiResponse<CustomReportDto>> updateSchedule(
            @PathVariable Long id,
            @RequestBody Map<String, Object> schedulePayload) {
        CustomReport updated = reportExecutionService.updateSchedule(id, schedulePayload);
        return ResponseEntity.ok(ApiResponse.ok(toDto(updated)));
    }

    /** POST /v1/reports/custom/{id}/share */
    @PostMapping("/custom/{id}/share")
    public ResponseEntity<ApiResponse<Void>> shareReport(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        reportExecutionService.getById(id).ifPresent(report -> {
            report.setAccessLevel("SHARED");
            @SuppressWarnings("unchecked")
            List<String> emails = (List<String>) body.get("emails");
            if (emails != null) report.setRecipients(emails);
            reportExecutionService.save(report);
        });
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** POST /v1/reports/custom/preview — runs the report config without saving */
    @PostMapping("/custom/preview")
    public ResponseEntity<ApiResponse<ReportRunResult>> previewReport(
            @RequestBody Map<String, Object> config) {
        // Build a transient report for preview execution
        CustomReport temp = new CustomReport();
        temp.setReportName("Preview");
        temp.setConfig(config);
        temp.setOwner("preview");
        CustomReport saved = reportExecutionService.save(temp);
        try {
            Map<String, Object> result = reportExecutionService.run(saved.getId());
            ReportRunResult dto = ReportRunResult.builder()
                    .reportId(String.valueOf(result.get("reportId")))
                    .runAt(String.valueOf(result.get("runAt")))
                    .rowCount(((Number) result.get("rowCount")).intValue())
                    .columns(castToListOfMaps(result.get("columns")))
                    .rows(castToListOfMaps(result.get("rows")))
                    .executionId(((Number) result.get("executionId")).longValue())
                    .durationMs(((Number) result.get("durationMs")).intValue())
                    .build();
            return ResponseEntity.ok(ApiResponse.ok(dto));
        } finally {
            reportExecutionService.delete(saved.getId());
        }
    }

    /** POST /v1/reports/custom/{id}/clone */
    @PostMapping("/custom/{id}/clone")
    public ResponseEntity<ApiResponse<CustomReportDto>> cloneReport(
            @PathVariable Long id,
            Authentication auth) {
        CustomReport original = reportExecutionService.getById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));
        CustomReport clone = new CustomReport();
        clone.setReportName("Copy of " + original.getReportName());
        clone.setDescription(original.getDescription());
        clone.setCategory(original.getCategory());
        clone.setConfig(original.getConfig() != null ? new LinkedHashMap<>(original.getConfig()) : null);
        clone.setOwner(auth.getName());
        clone.setAccessLevel("PRIVATE");
        clone.setStatus("ACTIVE");
        clone.setCreatedAt(Instant.now());
        CustomReport saved = reportExecutionService.save(clone);
        return ResponseEntity.ok(ApiResponse.ok(toDto(saved)));
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private CustomReportDto toDto(CustomReport r) {
        String scheduleType = "MANUAL";
        if (r.getSchedule() != null && r.getSchedule().get("frequency") != null) {
            scheduleType = String.valueOf(r.getSchedule().get("frequency"));
        }
        return CustomReportDto.builder()
                .id(r.getId() != null ? String.valueOf(r.getId()) : null)
                .name(r.getReportName())
                .description(r.getDescription())
                .category(r.getCategory())
                .createdBy(r.getOwner())
                .createdAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null)
                .schedule(scheduleType)
                .config(r.getConfig())
                .savedTo(mapAccessLevelToSavedTo(r.getAccessLevel()))
                .status(r.getStatus())
                .build();
    }

    /** Maps frontend savedTo → backend accessLevel */
    private String mapSavedToToAccessLevel(String savedTo) {
        if (savedTo == null) return "PRIVATE";
        return switch (savedTo) {
            case "SHARED"     -> "SHARED";
            case "DEPARTMENT" -> "PUBLIC";
            default           -> "PRIVATE";  // MY_REPORTS → PRIVATE
        };
    }

    /** Maps backend accessLevel → frontend savedTo */
    private String mapAccessLevelToSavedTo(String accessLevel) {
        if (accessLevel == null) return "MY_REPORTS";
        return switch (accessLevel) {
            case "SHARED" -> "SHARED";
            case "PUBLIC" -> "DEPARTMENT";
            default       -> "MY_REPORTS";  // PRIVATE → MY_REPORTS
        };
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castToListOfMaps(Object obj) {
        if (obj instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
    }

    /** Static data source definitions for the custom report builder. */
    private List<DataSourceDto> buildDataSources() {
        return List.of(
            DataSourceDto.builder().id("customers").name("Customers").category("Core Banking")
                .fields(List.of(
                    field("customerId",  "Customer ID",    "TEXT",   false, true,  false),
                    field("fullName",    "Full Name",      "TEXT",   false, true,  false),
                    field("customerType","Customer Type",  "TEXT",   false, true,  true),
                    field("status",      "Status",         "TEXT",   false, true,  true),
                    field("openedDate",  "Opened Date",    "DATE",   false, true,  true),
                    field("branchCode",  "Branch",         "TEXT",   false, true,  true)
                )).build(),
            DataSourceDto.builder().id("accounts").name("Accounts").category("Core Banking")
                .fields(List.of(
                    field("accountNumber","Account Number","TEXT",   false, true,  false),
                    field("accountType", "Account Type",  "TEXT",   false, true,  true),
                    field("balance",     "Balance",        "MONEY",  true,  true,  false),
                    field("status",      "Status",         "TEXT",   false, true,  true),
                    field("openedDate",  "Opened Date",    "DATE",   false, true,  true)
                )).build(),
            DataSourceDto.builder().id("loans").name("Loans").category("Lending")
                .fields(List.of(
                    field("loanNumber",  "Loan Number",   "TEXT",   false, true,  false),
                    field("productType", "Product Type",  "TEXT",   false, true,  true),
                    field("outstandingBalance","Outstanding","MONEY",true,  true,  false),
                    field("daysPastDue", "Days Past Due", "NUMBER", true,  true,  true),
                    field("status",      "Status",         "TEXT",   false, true,  true)
                )).build(),
            DataSourceDto.builder().id("payments").name("Payments").category("Payments")
                .fields(List.of(
                    field("paymentReference","Reference",  "TEXT",  false, true,  false),
                    field("amount",       "Amount",         "MONEY",  true,  true,  false),
                    field("paymentStatus","Status",         "TEXT",   false, true,  true),
                    field("paymentType",  "Type",           "TEXT",   false, true,  true),
                    field("valueDate",    "Value Date",     "DATE",   false, true,  true)
                )).build(),
            DataSourceDto.builder().id("fixed_deposits").name("Fixed Deposits").category("Deposits")
                .fields(List.of(
                    field("depositId",   "Deposit ID",     "TEXT",   false, true,  false),
                    field("principal",   "Principal",      "MONEY",  true,  true,  false),
                    field("rate",        "Interest Rate",  "NUMBER", true,  true,  false),
                    field("maturityDate","Maturity Date",  "DATE",   false, true,  true)
                )).build(),
            DataSourceDto.builder().id("transactions").name("Transactions").category("Operations")
                .fields(List.of(
                    field("txnRef",      "Reference",      "TEXT",   false, true,  false),
                    field("txnAmount",   "Amount",         "MONEY",  true,  true,  false),
                    field("txnType",     "Type",           "TEXT",   false, true,  true),
                    field("txnDate",     "Date",           "DATE",   false, true,  true)
                )).build()
        );
    }

    private DataFieldDto field(String id, String displayName, String type,
                               boolean aggregatable, boolean filterable, boolean groupable) {
        return DataFieldDto.builder()
                .id(id).name(id).displayName(displayName).type(type)
                .aggregatable(aggregatable).filterable(filterable).groupable(groupable)
                .build();
    }
}
