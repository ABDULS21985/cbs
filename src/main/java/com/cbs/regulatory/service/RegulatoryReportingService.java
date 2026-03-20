package com.cbs.regulatory.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.cbs.regulatory.entity.*;
import com.cbs.regulatory.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RegulatoryReportingService {

    private final RegulatoryReportDefinitionRepository definitionRepository;
    private final RegulatoryReportRunRepository runRepository;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public RegulatoryReportDefinition createDefinition(RegulatoryReportDefinition def) {
        RegulatoryReportDefinition saved = definitionRepository.save(def);
        log.info("Regulatory report defined: code={}, regulator={}, freq={}", def.getReportCode(), def.getRegulator(), def.getFrequency());
        return saved;
    }

    public List<RegulatoryReportDefinition> getAllDefinitions() {
        return definitionRepository.findByIsActiveTrueOrderByReportNameAsc();
    }

    public List<RegulatoryReportDefinition> getByRegulator(String regulator) {
        return definitionRepository.findByRegulatorAndIsActiveTrue(regulator);
    }

    @Transactional
    public RegulatoryReportRun generateReport(String reportCode, LocalDate periodStart, LocalDate periodEnd) {
        RegulatoryReportDefinition def = definitionRepository.findByReportCode(reportCode)
                .orElseThrow(() -> new ResourceNotFoundException("ReportDefinition", "reportCode", reportCode));
        String generatedBy = currentActorProvider.getCurrentActor();

        long startTime = System.currentTimeMillis();

        RegulatoryReportRun run = RegulatoryReportRun.builder()
                .reportCode(reportCode)
                .reportingPeriodStart(periodStart).reportingPeriodEnd(periodEnd)
                .status("GENERATING").generatedBy(generatedBy).generatedAt(Instant.now()).build();

        try {
            int recordCount = 0;
            String dataQuery = def.getDataQuery();
            if (dataQuery != null && !dataQuery.isBlank()) {
                String normalizedDataQuery = dataQuery.trim();
                while (normalizedDataQuery.endsWith(";")) {
                    normalizedDataQuery = normalizedDataQuery.substring(0, normalizedDataQuery.length() - 1).trim();
                }

                Query countQuery = entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM (" + normalizedDataQuery + ") regulatory_report_data");
                bindIfPresent(countQuery, "reportCode", reportCode);
                bindIfPresent(countQuery, "report_code", reportCode);
                bindIfPresent(countQuery, "periodStart", periodStart);
                bindIfPresent(countQuery, "period_start", periodStart);
                bindIfPresent(countQuery, "periodEnd", periodEnd);
                bindIfPresent(countQuery, "period_end", periodEnd);

                Object countResult = countQuery.getSingleResult();
                recordCount = countResult instanceof Number
                        ? ((Number) countResult).intValue()
                        : Integer.parseInt(countResult.toString());
            }
            String outputFormat = normalizeOutputFormat(def.getOutputFormat());
            Path reportDirectory = Path.of("build", "reports", sanitizePathSegment(def.getRegulator()))
                    .toAbsolutePath()
                    .normalize();
            Files.createDirectories(reportDirectory);

            Path reportPath = reportDirectory.resolve(String.format("%s_%s_%s.%s",
                    sanitizePathSegment(reportCode),
                    periodStart,
                    periodEnd,
                    outputFormat.toLowerCase(Locale.ROOT)));

            String renderedOutput = renderOutput(def, reportCode, periodStart, periodEnd, generatedBy, run.getGeneratedAt(), recordCount, outputFormat);
            Files.writeString(reportPath, renderedOutput, StandardCharsets.UTF_8);

            long fileSize = Files.size(reportPath);
            String filePath = reportPath.toString();

            run.setRecordCount(recordCount);
            run.setFilePath(filePath);
            run.setFileSizeBytes(fileSize);
            run.setGenerationTimeMs((int)(System.currentTimeMillis() - startTime));
            run.setStatus("COMPLETED");

            log.info("Report generated: code={}, period={}-{}, records={}, time={}ms",
                    reportCode, periodStart, periodEnd, recordCount, run.getGenerationTimeMs());
        } catch (Exception e) {
            run.setStatus("FAILED");
            run.setErrorMessage(e.getMessage());
            log.error("Report generation failed: code={}, error={}", reportCode, e.getMessage());
        }

        return runRepository.save(run);
    }

    @Transactional
    public RegulatoryReportRun submitReport(Long runId) {
        RegulatoryReportRun run = runRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("ReportRun", "id", runId));
        String submittedBy = currentActorProvider.getCurrentActor();

        if (!"COMPLETED".equals(run.getStatus())) {
            throw new BusinessException("Report must be in COMPLETED status to submit", "REPORT_NOT_COMPLETED");
        }

        run.setStatus("SUBMITTED");
        run.setSubmittedBy(submittedBy);
        run.setSubmittedAt(Instant.now());
        run.setSubmissionRef("SUB-" + System.currentTimeMillis());

        log.info("Report submitted: code={}, ref={}", run.getReportCode(), run.getSubmissionRef());
        return runRepository.save(run);
    }

    public Page<RegulatoryReportRun> getReportRuns(String reportCode, Pageable pageable) {
        return runRepository.findByReportCodeOrderByCreatedAtDesc(reportCode, pageable);
    }

    private void bindIfPresent(Query query, String parameterName, Object value) {
        try {
            query.setParameter(parameterName, value);
        } catch (IllegalArgumentException ignored) {
            // Ignore placeholders that are not used by the stored report query.
        }
    }

    private String renderOutput(RegulatoryReportDefinition def,
                                String reportCode,
                                LocalDate periodStart,
                                LocalDate periodEnd,
                                String generatedBy,
                                Instant generatedAt,
                                int recordCount,
                                String outputFormat) {
        Map<String, Object> templateConfig = def.getTemplateConfig() != null ? def.getTemplateConfig() : Map.of();
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("reportCode", reportCode);
        model.put("reportName", def.getReportName());
        model.put("regulator", def.getRegulator());
        model.put("frequency", def.getFrequency());
        model.put("reportCategory", def.getReportCategory() != null ? def.getReportCategory().name() : null);
        model.put("periodStart", periodStart);
        model.put("periodEnd", periodEnd);
        model.put("generatedBy", generatedBy);
        model.put("generatedAt", generatedAt);
        model.put("recordCount", recordCount);
        model.put("outputFormat", outputFormat);

        String template = resolveTemplate(templateConfig);
        String renderedTemplate = applyTemplate(template, model);

        return switch (outputFormat) {
            case "CSV" -> renderCsv(model, renderedTemplate);
            case "JSON" -> renderJson(model, templateConfig, renderedTemplate);
            case "XML" -> renderXml(model, templateConfig, renderedTemplate);
            default -> renderedTemplate;
        };
    }

    private String resolveTemplate(Map<String, Object> templateConfig) {
        for (String key : List.of("template", "body", "content")) {
            Object value = templateConfig.get(key);
            if (value instanceof String text && !text.isBlank()) {
                return text;
            }
        }
        return """
                Report: {{reportName}} ({{reportCode}})
                Regulator: {{regulator}}
                Frequency: {{frequency}}
                Category: {{reportCategory}}
                Period: {{periodStart}} to {{periodEnd}}
                Generated By: {{generatedBy}}
                Generated At: {{generatedAt}}
                Record Count: {{recordCount}}
                Output Format: {{outputFormat}}
                """;
    }

    private String applyTemplate(String template, Map<String, Object> model) {
        String rendered = template;
        for (Map.Entry<String, Object> entry : model.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}", stringify(entry.getValue()));
        }
        return rendered;
    }

    private String renderCsv(Map<String, Object> model, String renderedTemplate) {
        StringBuilder csv = new StringBuilder("field,value\n");
        for (Map.Entry<String, Object> entry : model.entrySet()) {
            csv.append(csvValue(entry.getKey()))
                    .append(',')
                    .append(csvValue(stringify(entry.getValue())))
                    .append('\n');
        }
        csv.append(csvValue("renderedTemplate"))
                .append(',')
                .append(csvValue(renderedTemplate))
                .append('\n');
        return csv.toString();
    }

    private String renderJson(Map<String, Object> model, Map<String, Object> templateConfig, String renderedTemplate) {
        Map<String, Object> payload = new LinkedHashMap<>(model);
        payload.put("templateConfig", templateConfig);
        payload.put("renderedTemplate", renderedTemplate);
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize report output", e);
        }
    }

    private String renderXml(Map<String, Object> model, Map<String, Object> templateConfig, String renderedTemplate) {
        StringBuilder xml = new StringBuilder("<report>");
        for (Map.Entry<String, Object> entry : model.entrySet()) {
            xml.append("<").append(entry.getKey()).append(">")
                    .append(xmlEscape(stringify(entry.getValue())))
                    .append("</").append(entry.getKey()).append(">");
        }
        xml.append("<templateConfig>")
                .append(xmlEscape(writeJson(templateConfig)))
                .append("</templateConfig>")
                .append("<renderedTemplate>")
                .append(xmlEscape(renderedTemplate))
                .append("</renderedTemplate>")
                .append("</report>");
        return xml.toString();
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize report template config", e);
        }
    }

    private String csvValue(String value) {
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }

    private String stringify(Object value) {
        return value == null ? "" : value.toString();
    }

    private String xmlEscape(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private String sanitizePathSegment(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.replaceAll("[^A-Za-z0-9._-]+", "_");
    }

    private String normalizeOutputFormat(String outputFormat) {
        if (outputFormat == null || outputFormat.isBlank()) {
            return "XLSX";
        }
        return outputFormat.trim().toUpperCase(Locale.ROOT);
    }
}
