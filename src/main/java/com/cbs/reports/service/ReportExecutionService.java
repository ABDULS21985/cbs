package com.cbs.reports.service;

import com.cbs.reports.entity.CustomReport;
import com.cbs.reports.entity.ReportExecution;
import com.cbs.reports.repository.CustomReportRepository;
import com.cbs.reports.repository.ReportExecutionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportExecutionService {

    private final CustomReportRepository customReportRepository;
    private final ReportExecutionRepository reportExecutionRepository;
    private final EntityManager entityManager;

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
            Map<String, Object> config = report.getConfig() != null ? report.getConfig() : Map.of();
            String dataQuery = config.containsKey("dataQuery") ? (String) config.get("dataQuery") : null;

            List<Map<String, Object>> rows;
            List<Map<String, Object>> columns;

            if (dataQuery != null && !dataQuery.isBlank()) {
                // Execute the real SQL query from the report definition
                rows = executeReportQuery(dataQuery, config);
                columns = deriveColumnDefs(rows, config);
            } else {
                // No query defined: use column-based config to build a metadata-only response
                rows = List.of();
                columns = buildColumnDefs(config);
                log.warn("Report {} has no dataQuery configured; returning empty result set", reportId);
            }

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
                    "columns", columns,
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

    /**
     * Executes the report's native SQL query and converts result rows to maps.
     * Binds optional parameters from the report config if present.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> executeReportQuery(String dataQuery, Map<String, Object> config) {
        // Strip trailing semicolons to avoid SQL syntax errors in subqueries
        String normalizedQuery = dataQuery.trim();
        while (normalizedQuery.endsWith(";")) {
            normalizedQuery = normalizedQuery.substring(0, normalizedQuery.length() - 1).trim();
        }

        // Apply row limit from config (default 10000 to prevent runaway queries)
        int maxRows = config.containsKey("maxRows")
                ? ((Number) config.get("maxRows")).intValue()
                : 10000;

        Query query = entityManager.createNativeQuery(normalizedQuery);
        query.setMaxResults(maxRows);

        // Bind named parameters from config if provided
        Map<String, Object> params = config.containsKey("parameters")
                ? (Map<String, Object>) config.get("parameters")
                : Map.of();
        for (Map.Entry<String, Object> param : params.entrySet()) {
            try {
                query.setParameter(param.getKey(), param.getValue());
            } catch (IllegalArgumentException ignored) {
                // Parameter not present in the query; skip silently
            }
        }

        List<Object[]> resultRows = query.getResultList();
        if (resultRows.isEmpty()) return List.of();

        // Derive column names: use config-provided column names or positional defaults
        List<String> columnNames = resolveColumnNames(config, resultRows.isEmpty() ? 0 : getColumnCount(resultRows.get(0)));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object resultRow : resultRows) {
            Map<String, Object> row = new LinkedHashMap<>();
            if (resultRow instanceof Object[] cols) {
                for (int i = 0; i < cols.length; i++) {
                    String colName = i < columnNames.size() ? columnNames.get(i) : "col_" + i;
                    row.put(colName, cols[i]);
                }
            } else {
                // Single-column result
                String colName = columnNames.isEmpty() ? "value" : columnNames.get(0);
                row.put(colName, resultRow);
            }
            rows.add(row);
        }
        log.info("Report query executed: {} rows returned", rows.size());
        return rows;
    }

    @SuppressWarnings("unchecked")
    private List<String> resolveColumnNames(Map<String, Object> config, int columnCount) {
        // Try to get column names from config.columns definitions
        if (config.containsKey("columns")) {
            List<Object> columns = (List<Object>) config.get("columns");
            List<String> names = new ArrayList<>();
            for (Object col : columns) {
                if (col instanceof Map) {
                    Map<String, Object> c = (Map<String, Object>) col;
                    names.add(String.valueOf(c.getOrDefault("fieldName", "col_" + names.size())));
                } else if (col instanceof String) {
                    names.add((String) col);
                }
            }
            return names;
        }
        // Fallback: positional column names
        List<String> names = new ArrayList<>();
        for (int i = 0; i < columnCount; i++) {
            names.add("col_" + i);
        }
        return names;
    }

    private int getColumnCount(Object row) {
        if (row instanceof Object[] cols) return cols.length;
        return 1;
    }

    /**
     * Derives column definitions from actual query result data when a real query was executed.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> deriveColumnDefs(List<Map<String, Object>> rows, Map<String, Object> config) {
        // If explicit column definitions exist in config, use them
        List<Map<String, Object>> configDefs = buildColumnDefs(config);
        if (!configDefs.isEmpty() && configDefs.size() > 1) return configDefs;

        // Otherwise derive from actual row keys
        if (rows.isEmpty()) return List.of();
        Map<String, Object> firstRow = rows.get(0);
        List<Map<String, Object>> defs = new ArrayList<>();
        for (Map.Entry<String, Object> entry : firstRow.entrySet()) {
            String type = entry.getValue() instanceof Number ? "NUMBER" : "TEXT";
            defs.add(Map.of("key", entry.getKey(), "label", entry.getKey(), "type", type));
        }
        return defs;
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

    // ─── Column definition helpers ────────────────────────────────────────────

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
