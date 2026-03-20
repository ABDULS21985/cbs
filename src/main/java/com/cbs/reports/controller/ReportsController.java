package com.cbs.reports.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.reports.dto.ReportDTOs.*;
import com.cbs.reports.entity.CustomReport;
import com.cbs.reports.entity.ReportExecution;
import com.cbs.reports.service.ReportExecutionService;
import com.cbs.reports.service.ReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
public class ReportsController {

    private final ReportsService reportsService;
    private final ReportExecutionService reportExecutionService;

    // ========================================================================
    // CUSTOM REPORT BUILDER — /v1/reports/custom/*
    // ========================================================================

    @PostMapping("/custom/save")
    public ResponseEntity<ApiResponse<CustomReport>> saveCustomReport(
            @RequestBody Map<String, Object> req,
            Authentication auth) {
        String owner = auth != null ? auth.getName() : "anonymous";

        Long id = req.containsKey("id") ? Long.valueOf(String.valueOf(req.get("id"))) : null;
        CustomReport report;
        if (id != null) {
            report = reportExecutionService.getById(id)
                    .orElse(new CustomReport());
        } else {
            report = new CustomReport();
        }

        if (req.containsKey("name")) report.setReportName(String.valueOf(req.get("name")));
        if (req.containsKey("description")) report.setDescription(String.valueOf(req.get("description")));
        if (req.containsKey("category")) report.setCategory(String.valueOf(req.get("category")));
        if (req.containsKey("savedTo")) {
            String savedTo = String.valueOf(req.get("savedTo"));
            String accessLevel = "MY_REPORTS".equals(savedTo) ? "PRIVATE"
                    : "SHARED".equals(savedTo) ? "SHARED"
                    : "PUBLIC";
            report.setAccessLevel(accessLevel);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> config = req.containsKey("config")
                ? (Map<String, Object>) req.get("config")
                : Map.of();
        report.setConfig(config);

        if (req.containsKey("schedule")) {
            Map<String, Object> scheduleMap = new HashMap<>();
            scheduleMap.put("frequency", req.get("schedule"));
            if (req.containsKey("scheduleTime")) scheduleMap.put("time", req.get("scheduleTime"));
            if (req.containsKey("scheduleDay")) scheduleMap.put("day", req.get("scheduleDay"));
            if (req.containsKey("exportFormat")) scheduleMap.put("format", req.get("exportFormat"));
            report.setSchedule(scheduleMap);
        }

        if (req.containsKey("deliveryEmails")) {
            @SuppressWarnings("unchecked")
            List<String> emails = (List<String>) req.get("deliveryEmails");
            report.setRecipients(emails);
        }

        report.setOwner(owner);
        report.setStatus("ACTIVE");

        CustomReport saved = reportExecutionService.save(report);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @GetMapping("/custom/mine")
    public ResponseEntity<ApiResponse<List<CustomReport>>> getMyReports(Authentication auth) {
        String owner = auth != null ? auth.getName() : "anonymous";
        return ResponseEntity.ok(ApiResponse.ok(reportExecutionService.getByOwner(owner)));
    }

    @GetMapping("/custom")
    public ResponseEntity<ApiResponse<List<CustomReport>>> getAllCustomReports(
            @RequestParam(required = false) String owner) {
        List<CustomReport> reports;
        if ("mine".equals(owner)) {
            reports = reportExecutionService.getByOwner("anonymous"); // auth context would be used in real impl
        } else if ("shared".equals(owner)) {
            reports = reportExecutionService.getShared();
        } else {
            reports = reportExecutionService.getAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(reports));
    }

    @GetMapping("/custom/data-sources")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDataSources() {
        List<Map<String, Object>> sources = List.of(
            buildDataSource("customers", "Customers", "Customer data",
                List.of("customerId:TEXT", "fullName:TEXT", "email:TEXT", "phone:TEXT", "status:TEXT", "riskRating:TEXT", "segment:TEXT", "createdAt:DATE")),
            buildDataSource("accounts", "Accounts", "Account data",
                List.of("accountNumber:TEXT", "accountType:TEXT", "balance:MONEY", "currency:TEXT", "status:TEXT", "openDate:DATE", "branchCode:TEXT")),
            buildDataSource("loans", "Loans", "Loan portfolio",
                List.of("loanNumber:TEXT", "productType:TEXT", "principal:MONEY", "outstandingBalance:MONEY", "interestRate:NUMBER", "dpdBucket:TEXT", "disbursementDate:DATE", "maturityDate:DATE")),
            buildDataSource("deposits", "Deposits", "Fixed deposits",
                List.of("depositId:TEXT", "principal:MONEY", "rate:NUMBER", "tenor:NUMBER", "maturityDate:DATE", "status:TEXT")),
            buildDataSource("payments", "Payments", "Payment instructions",
                List.of("paymentReference:TEXT", "amount:MONEY", "currency:TEXT", "channel:TEXT", "paymentStatus:TEXT", "valueDate:DATE", "narration:TEXT")),
            buildDataSource("transactions", "Transactions", "Debit/credit transactions",
                List.of("txnRef:TEXT", "txnAmount:MONEY", "txnType:TEXT", "channel:TEXT", "valueDate:DATE", "description:TEXT")),
            buildDataSource("gl", "GL / Ledger", "General ledger entries",
                List.of("glCode:TEXT", "accountName:TEXT", "debit:MONEY", "credit:MONEY", "balance:MONEY", "postingDate:DATE", "category:TEXT"))
        );
        return ResponseEntity.ok(ApiResponse.ok(sources));
    }

    @GetMapping("/custom/{id}")
    public ResponseEntity<ApiResponse<CustomReport>> getCustomReport(@PathVariable Long id) {
        return reportExecutionService.getById(id)
                .map(r -> ResponseEntity.ok(ApiResponse.ok(r)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/custom/{id}/run")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runCustomReport(@PathVariable Long id) {
        Map<String, Object> result = reportExecutionService.run(id);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/custom/preview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewReport(@RequestBody Map<String, Object> config) {
        // Build a transient report for preview — cleaned up after execution
        CustomReport preview = new CustomReport();
        preview.setReportName("__preview__" + System.currentTimeMillis());
        preview.setConfig(config);
        CustomReport saved = reportExecutionService.save(preview);
        Map<String, Object> result = reportExecutionService.run(saved.getId());
        reportExecutionService.delete(saved.getId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/custom/{id}/history")
    public ResponseEntity<ApiResponse<List<ReportExecution>>> getRunHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(reportExecutionService.getHistory(id)));
    }

    @PostMapping("/custom/{id}/schedule")
    public ResponseEntity<ApiResponse<CustomReport>> scheduleReport(
            @PathVariable Long id,
            @RequestBody Map<String, Object> schedule) {
        CustomReport updated = reportExecutionService.updateSchedule(id, schedule);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PostMapping("/custom/{id}/clone")
    public ResponseEntity<ApiResponse<CustomReport>> cloneReport(@PathVariable Long id) {
        CustomReport original = reportExecutionService.getById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));
        CustomReport clone = CustomReport.builder()
                .reportName(original.getReportName() + " (Copy)")
                .description(original.getDescription())
                .category(original.getCategory())
                .owner(original.getOwner())
                .config(original.getConfig())
                .schedule(original.getSchedule())
                .recipients(original.getRecipients())
                .accessLevel(original.getAccessLevel())
                .status("DRAFT")
                .build();
        CustomReport saved = reportExecutionService.save(clone);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @PostMapping("/custom/{id}/share")
    public ResponseEntity<ApiResponse<Void>> shareReport(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        // Update access level to SHARED and store emails
        reportExecutionService.getById(id).ifPresent(report -> {
            report.setAccessLevel("SHARED");
            reportExecutionService.save(report);
        });
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @DeleteMapping("/custom/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomReport(@PathVariable Long id) {
        reportExecutionService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // Helper to build data source descriptor
    private Map<String, Object> buildDataSource(String id, String name, String category, List<String> fieldDefs) {
        List<Map<String, Object>> fields = new java.util.ArrayList<>();
        for (String def : fieldDefs) {
            String[] parts = def.split(":");
            String fieldId = id + "." + parts[0];
            String fieldType = parts.length > 1 ? parts[1] : "TEXT";
            boolean aggregatable = "NUMBER".equals(fieldType) || "MONEY".equals(fieldType);
            fields.add(Map.of(
                "id", fieldId,
                "name", parts[0],
                "displayName", toDisplayName(parts[0]),
                "type", fieldType,
                "aggregatable", aggregatable,
                "filterable", true,
                "groupable", !aggregatable
            ));
        }
        return Map.of(
            "id", id,
            "name", name,
            "category", category,
            "fields", fields
        );
    }

    private String toDisplayName(String camelCase) {
        String spaced = camelCase.replaceAll("([A-Z])", " $1").trim();
        if (spaced.isEmpty()) return camelCase;
        return Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1);
    }

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
