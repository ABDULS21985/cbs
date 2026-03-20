package com.cbs.reports.service;

import com.cbs.reports.entity.CustomReport;
import com.cbs.reports.entity.ReportExecution;
import com.cbs.reports.repository.CustomReportRepository;
import com.cbs.reports.repository.ReportExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportExecutionService {

    private final CustomReportRepository customReportRepository;
    private final ReportExecutionRepository reportExecutionRepository;

    @Transactional
    public CustomReport save(CustomReport report) {
        report.setUpdatedAt(Instant.now());
        if (report.getReportCode() == null || report.getReportCode().isBlank()) {
            report.setReportCode("RPT-" + System.currentTimeMillis());
        }
        return customReportRepository.save(report);
    }

    public List<CustomReport> getByOwner(String owner) {
        return customReportRepository.findByOwnerOrderByCreatedAtDesc(owner);
    }

    public Optional<CustomReport> getById(Long id) {
        return customReportRepository.findById(id);
    }

    public List<CustomReport> getAll() {
        return customReportRepository.findAll();
    }

    public List<CustomReport> getShared() {
        return customReportRepository.findByAccessLevelIn(List.of("SHARED", "PUBLIC"));
    }

    @Transactional
    public Map<String, Object> run(Long reportId) {
        CustomReport report = customReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));

        long start = System.currentTimeMillis();

        ReportExecution execution = ReportExecution.builder()
                .reportId(reportId)
                .status("RUNNING")
                .build();
        execution = reportExecutionRepository.save(execution);

        try {
            // Simulate report execution based on config
            Map<String, Object> config = report.getConfig() != null ? report.getConfig() : Map.of();
            List<Map<String, Object>> rows = generateSampleData(config);
            int duration = (int) (System.currentTimeMillis() - start);

            execution.setStatus("COMPLETED");
            execution.setRowCount(rows.size());
            execution.setDurationMs(duration);
            execution.setCompletedAt(Instant.now());
            reportExecutionRepository.save(execution);

            return Map.of(
                    "reportId", String.valueOf(reportId),
                    "runAt", Instant.now().toString(),
                    "rowCount", rows.size(),
                    "columns", buildColumnDefs(config),
                    "rows", rows,
                    "executionId", execution.getId(),
                    "durationMs", duration
            );
        } catch (Exception e) {
            execution.setStatus("FAILED");
            execution.setErrorMessage(e.getMessage());
            execution.setCompletedAt(Instant.now());
            execution.setDurationMs((int) (System.currentTimeMillis() - start));
            reportExecutionRepository.save(execution);
            throw new RuntimeException("Report execution failed", e);
        }
    }

    public List<ReportExecution> getHistory(Long reportId) {
        return reportExecutionRepository.findByReportIdOrderByCreatedAtDesc(reportId);
    }

    @Transactional
    public CustomReport updateSchedule(Long reportId, Map<String, Object> schedule) {
        CustomReport report = customReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));
        report.setSchedule(schedule);
        report.setUpdatedAt(Instant.now());
        return customReportRepository.save(report);
    }

    @Transactional
    public void delete(Long id) {
        CustomReport report = customReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));
        report.setStatus("DELETED");
        report.setUpdatedAt(Instant.now());
        customReportRepository.save(report);
    }

    // ─── Sample data generation helpers ──────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> generateSampleData(Map<String, Object> config) {
        List<String> dataSources = config.containsKey("dataSources")
                ? (List<String>) config.get("dataSources")
                : List.of();

        Random rnd = new Random(42);
        List<Map<String, Object>> rows = new ArrayList<>();
        int count = 10 + rnd.nextInt(41); // 10-50 rows

        for (int i = 0; i < count; i++) {
            Map<String, Object> row = new LinkedHashMap<>();
            if (dataSources.contains("customers")) {
                row.put("customerId", "CUST-" + (1000 + i));
                row.put("fullName", "Customer " + (i + 1));
                row.put("status", i % 5 == 0 ? "INACTIVE" : "ACTIVE");
            }
            if (dataSources.contains("accounts")) {
                row.put("accountNumber", "ACC-" + (2000 + i));
                row.put("accountType", i % 2 == 0 ? "SAVINGS" : "CURRENT");
                row.put("balance", Math.round(rnd.nextDouble() * 100000 * 100.0) / 100.0);
            }
            if (dataSources.contains("loans")) {
                row.put("loanNumber", "LN-" + (3000 + i));
                row.put("productType", i % 3 == 0 ? "PERSONAL" : i % 3 == 1 ? "MORTGAGE" : "SME");
                row.put("outstandingBalance", Math.round(rnd.nextDouble() * 500000 * 100.0) / 100.0);
            }
            if (dataSources.contains("payments")) {
                row.put("paymentReference", "PAY-" + (4000 + i));
                row.put("amount", Math.round(rnd.nextDouble() * 50000 * 100.0) / 100.0);
                row.put("paymentStatus", i % 4 == 0 ? "FAILED" : "SUCCESS");
            }
            if (dataSources.contains("cards")) {
                row.put("cardNumber", "**** **** **** " + (1000 + i));
                row.put("cardType", i % 2 == 0 ? "DEBIT" : "CREDIT");
                row.put("cardStatus", i % 6 == 0 ? "BLOCKED" : "ACTIVE");
            }
            if (dataSources.contains("fixed_deposits") || dataSources.contains("deposits")) {
                row.put("depositId", "FD-" + (5000 + i));
                row.put("principal", Math.round(rnd.nextDouble() * 200000 * 100.0) / 100.0);
                row.put("rate", Math.round(rnd.nextDouble() * 12 * 100.0) / 100.0);
            }
            if (dataSources.contains("transactions")) {
                row.put("txnRef", "TXN-" + (6000 + i));
                row.put("txnAmount", Math.round(rnd.nextDouble() * 20000 * 100.0) / 100.0);
                row.put("txnType", i % 2 == 0 ? "DEBIT" : "CREDIT");
            }
            if (row.isEmpty()) {
                row.put("id", i + 1);
                row.put("label", "Row " + (i + 1));
                row.put("value", Math.round(rnd.nextDouble() * 10000 * 100.0) / 100.0);
            }
            rows.add(row);
        }
        return rows;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> buildColumnDefs(Map<String, Object> config) {
        List<Object> columns = config.containsKey("columns")
                ? (List<Object>) config.get("columns")
                : List.of();

        if (!columns.isEmpty()) {
            List<Map<String, Object>> defs = new ArrayList<>();
            for (Object col : columns) {
                if (col instanceof Map) {
                    Map<String, Object> c = (Map<String, Object>) col;
                    defs.add(Map.of(
                            "key", c.getOrDefault("fieldName", "unknown"),
                            "label", c.getOrDefault("displayName", c.getOrDefault("fieldName", "unknown")),
                            "type", c.getOrDefault("type", "TEXT")
                    ));
                }
            }
            return defs;
        }

        return List.of(
                Map.of("key", "id", "label", "ID", "type", "NUMBER"),
                Map.of("key", "label", "label", "Label", "type", "TEXT"),
                Map.of("key", "value", "label", "Value", "type", "NUMBER")
        );
    }
}
