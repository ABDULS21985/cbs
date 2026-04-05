package com.cbs.regulatory.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.regulatory.dto.RegulatoryRequests;
import com.cbs.regulatory.dto.RegulatoryResponses;
import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnLineItem;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import com.cbs.regulatory.entity.ReturnAuditEvent;
import com.cbs.regulatory.repository.RegulatoryReturnLineItemRepository;
import com.cbs.regulatory.repository.RegulatoryReturnRepository;
import com.cbs.regulatory.repository.RegulatoryReturnTemplateRepository;
import com.cbs.regulatory.repository.ReturnAuditEventRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RegulatoryTemplateEngine {

    private static final Pattern VERSION_SUFFIX = Pattern.compile("-V(\\d+)$");
    private static final Pattern SUM_RANGE = Pattern.compile("SUM\\(([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+)\\)");
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final RegulatoryReturnTemplateRepository templateRepository;
    private final RegulatoryReturnRepository returnRepository;
    private final RegulatoryReturnLineItemRepository lineItemRepository;
    private final ReturnAuditEventRepository auditEventRepository;
    private final RegulatoryDataExtractionService extractionService;
    private final ObjectMapper objectMapper;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    private final ExpressionParser expressionParser = new SpelExpressionParser();

    public RegulatoryReturnTemplate createTemplate(RegulatoryRequests.CreateTemplateRequest request) {
        RegulatoryReturnTemplate template = RegulatoryReturnTemplate.builder()
                .templateCode(request.getTemplateCode())
                .jurisdiction(parseEnum(RegulatoryDomainEnums.Jurisdiction.class, request.getJurisdiction()))
                .returnType(parseEnum(RegulatoryDomainEnums.ReturnType.class, request.getReturnType()))
                .name(request.getName())
                .nameAr(request.getNameAr())
                .description(request.getDescription())
                .versionNumber(request.getVersion() != null ? request.getVersion() : 1)
                .effectiveFrom(request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now())
                .effectiveTo(request.getEffectiveTo())
                .sections(request.getSections())
                .validationRules(request.getValidationRules())
                .crossValidations(request.getCrossValidations())
                .outputFormat(parseEnum(RegulatoryDomainEnums.OutputFormat.class, request.getOutputFormat(), RegulatoryDomainEnums.OutputFormat.JSON))
                .xbrlTaxonomy(request.getXbrlTaxonomy())
                .reportingFrequency(parseEnum(RegulatoryDomainEnums.ReportingPeriodType.class, request.getReportingFrequency()))
                .filingDeadlineDaysAfterPeriod(request.getFilingDeadlineDaysAfterPeriod() != null ? request.getFilingDeadlineDaysAfterPeriod() : 15)
                .regulatorFormNumber(request.getRegulatorFormNumber())
                .regulatorPortalUrl(request.getRegulatorPortalUrl())
                .isActive(request.getIsActive() == null || request.getIsActive())
                .approvedBy(StringUtils.hasText(request.getApprovedBy()) ? request.getApprovedBy() : currentActor())
                .tenantId(currentTenantId())
                .build();
        return templateRepository.save(template);
    }

    public RegulatoryReturnTemplate updateTemplate(Long templateId, RegulatoryRequests.UpdateTemplateRequest request) {
        RegulatoryReturnTemplate existing = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturnTemplate", "id", templateId));
        existing.setIsActive(false);
        templateRepository.save(existing);

        int nextVersion = existing.getVersionNumber() + 1;
        RegulatoryReturnTemplate updated = RegulatoryReturnTemplate.builder()
                .templateCode(nextTemplateCode(existing.getTemplateCode(), nextVersion))
                .jurisdiction(existing.getJurisdiction())
                .returnType(existing.getReturnType())
                .name(StringUtils.hasText(request.getName()) ? request.getName() : existing.getName())
                .nameAr(StringUtils.hasText(request.getNameAr()) ? request.getNameAr() : existing.getNameAr())
                .description(StringUtils.hasText(request.getDescription()) ? request.getDescription() : existing.getDescription())
                .versionNumber(nextVersion)
                .effectiveFrom(request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now())
                .effectiveTo(request.getEffectiveTo())
                .sections(request.getSections() != null ? request.getSections() : existing.getSections())
                .validationRules(request.getValidationRules() != null ? request.getValidationRules() : existing.getValidationRules())
                .crossValidations(request.getCrossValidations() != null ? request.getCrossValidations() : existing.getCrossValidations())
                .outputFormat(parseEnum(RegulatoryDomainEnums.OutputFormat.class, request.getOutputFormat(), existing.getOutputFormat()))
                .xbrlTaxonomy(StringUtils.hasText(request.getXbrlTaxonomy()) ? request.getXbrlTaxonomy() : existing.getXbrlTaxonomy())
                .reportingFrequency(parseEnum(RegulatoryDomainEnums.ReportingPeriodType.class, request.getReportingFrequency(), existing.getReportingFrequency()))
                .filingDeadlineDaysAfterPeriod(request.getFilingDeadlineDaysAfterPeriod() != null
                        ? request.getFilingDeadlineDaysAfterPeriod()
                        : existing.getFilingDeadlineDaysAfterPeriod())
                .regulatorFormNumber(StringUtils.hasText(request.getRegulatorFormNumber())
                        ? request.getRegulatorFormNumber() : existing.getRegulatorFormNumber())
                .regulatorPortalUrl(StringUtils.hasText(request.getRegulatorPortalUrl())
                        ? request.getRegulatorPortalUrl() : existing.getRegulatorPortalUrl())
                .isActive(request.getIsActive() == null || request.getIsActive())
                .approvedBy(StringUtils.hasText(request.getApprovedBy()) ? request.getApprovedBy() : currentActor())
                .tenantId(currentTenantId())
                .build();
        return templateRepository.save(updated);
    }

    @Transactional(readOnly = true)
    public RegulatoryReturnTemplate getTemplate(String templateCode) {
        return templateRepository.findByTemplateCode(templateCode)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturnTemplate", "templateCode", templateCode));
    }

    @Transactional(readOnly = true)
    public RegulatoryReturnTemplate getActiveTemplate(String jurisdiction, String returnType) {
        return templateRepository
                .findTopByJurisdictionAndReturnTypeAndIsActiveTrueAndEffectiveFromLessThanEqualOrderByVersionNumberDesc(
                        parseEnum(RegulatoryDomainEnums.Jurisdiction.class, jurisdiction),
                        parseEnum(RegulatoryDomainEnums.ReturnType.class, returnType),
                        LocalDate.now())
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturnTemplate", "jurisdiction/returnType",
                        jurisdiction + "/" + returnType));
    }

    @Transactional(readOnly = true)
    public List<RegulatoryReturnTemplate> getTemplatesForJurisdiction(String jurisdiction) {
        return templateRepository.findByJurisdictionAndIsActiveTrueOrderByReturnTypeAscVersionNumberDesc(
                parseEnum(RegulatoryDomainEnums.Jurisdiction.class, jurisdiction));
    }

    @Transactional(readOnly = true)
    public List<RegulatoryReturnTemplate> getAllActiveTemplates() {
        return templateRepository.findByIsActiveTrueOrderByJurisdictionAscReturnTypeAscVersionNumberDesc();
    }

    public RegulatoryReturn generateReturn(String templateCode, LocalDate reportingDate, LocalDate periodFrom, LocalDate periodTo) {
        RegulatoryReturnTemplate template = getTemplate(templateCode);
        return generateReturn(template, reportingDate, periodFrom, periodTo, false);
    }

    public RegulatoryReturn regenerateReturn(Long returnId) {
        RegulatoryReturn existing = returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "id", returnId));
        RegulatoryReturnTemplate template = getTemplate(existing.getTemplateCode());
        lineItemRepository.deleteAll(lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(returnId));
        existing.setDataExtractionStatus(RegulatoryDomainEnums.DataExtractionStatus.IN_PROGRESS);
        existing.setStatus(RegulatoryDomainEnums.ReturnStatus.REVISED);
        existing.setGeneratedAt(LocalDateTime.now());
        existing.setGeneratedBy(currentActor());
        existing.setReturnDataVersion(existing.getReturnDataVersion() + 1);
        RegulatoryReturn saved = returnRepository.save(existing);
        persistLineItems(saved, template, saved.getReportingDate(), saved.getPeriodFrom(), saved.getPeriodTo(), Map.of(), true);
        recordAudit(saved.getId(), RegulatoryDomainEnums.AuditEventType.REGENERATED, Map.of(
                "templateCode", saved.getTemplateCode(),
                "returnDataVersion", saved.getReturnDataVersion()
        ));
        return saved;
    }

    public void overrideLineItem(Long returnId, String lineNumber, String newValue, String reason, String overrideBy) {
        RegulatoryReturn regulatoryReturn = returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "id", returnId));
        RegulatoryReturnTemplate template = getTemplate(regulatoryReturn.getTemplateCode());
        RegulatoryReturnLineItem target = lineItemRepository.findByReturnIdAndLineNumber(returnId, lineNumber)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturnLineItem", "lineNumber", lineNumber));
        target.setValue(newValue);
        target.setManualOverride(true);
        target.setManualOverrideBy(StringUtils.hasText(overrideBy) ? overrideBy : currentActor());
        target.setManualOverrideReason(reason);
        lineItemRepository.save(target);
        recalculateCalculatedLines(regulatoryReturn, template);
        recordAudit(returnId, RegulatoryDomainEnums.AuditEventType.LINE_OVERRIDDEN, Map.of(
                "lineNumber", lineNumber,
                "newValue", newValue,
                "reason", reason
        ));
    }

    public RegulatoryResponses.ValidationResult validateReturn(Long returnId) {
        RegulatoryReturn regulatoryReturn = returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "id", returnId));
        RegulatoryReturnTemplate template = getTemplate(regulatoryReturn.getTemplateCode());
        List<RegulatoryReturnLineItem> items = lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(returnId);
        RegulatoryResponses.ValidationResult result = validate(template, items, regulatoryReturn);
        regulatoryReturn.setValidationStatus(result.isValid()
                ? (result.getWarnings().isEmpty() ? RegulatoryDomainEnums.ReturnValidationStatus.VALID : RegulatoryDomainEnums.ReturnValidationStatus.WARNINGS)
                : RegulatoryDomainEnums.ReturnValidationStatus.INVALID);
        regulatoryReturn.setValidationErrors(Map.of("errors", result.getErrors()));
        regulatoryReturn.setValidationWarnings(Map.of("warnings", result.getWarnings()));
        regulatoryReturn.setCrossValidationStatus(result.getCrossValidationStatus());
        returnRepository.save(regulatoryReturn);
        recordAudit(returnId, RegulatoryDomainEnums.AuditEventType.VALIDATED, Map.of(
                "errors", result.getErrors().size(),
                "warnings", result.getWarnings().size(),
                "valid", result.isValid()
        ));
        return result;
    }

    public RegulatoryResponses.ValidationResult crossValidateReturns(Long returnId, List<Long> relatedReturnIds) {
        RegulatoryReturn regulatoryReturn = returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "id", returnId));
        RegulatoryReturnTemplate template = getTemplate(regulatoryReturn.getTemplateCode());
        List<Map<String, Object>> errors = new ArrayList<>();
        List<Map<String, Object>> crossValidations = template.getCrossValidations() != null ? template.getCrossValidations() : List.of();
        List<RegulatoryReturn> relatedReturns = returnRepository.findAllById(relatedReturnIds);
        for (Map<String, Object> validation : crossValidations) {
            String otherTemplate = string(validation.get("otherTemplate"));
            String otherLine = string(validation.get("otherLine"));
            String thisLine = string(validation.get("thisLine"));
            RegulatoryReturnLineItem currentLine = lineItemRepository.findByReturnIdAndLineNumber(returnId, thisLine).orElse(null);
            RegulatoryReturn related = relatedReturns.stream()
                    .filter(item -> item.getTemplateCode().equalsIgnoreCase(otherTemplate))
                    .findFirst()
                    .orElse(null);
            RegulatoryReturnLineItem relatedLine = related == null
                    ? null
                    : lineItemRepository.findByReturnIdAndLineNumber(related.getId(), otherLine).orElse(null);
            if (currentLine == null || relatedLine == null) {
                continue;
            }
            BigDecimal left = asDecimal(currentLine.getValue());
            BigDecimal right = asDecimal(relatedLine.getValue());
            if (left.compareTo(right) != 0) {
                errors.add(Map.of(
                        "rule", string(validation.get("message")),
                        "message", string(validation.get("message")),
                        "leftValue", left,
                        "rightValue", right
                ));
            }
        }
        RegulatoryDomainEnums.CrossValidationStatus status = errors.isEmpty()
                ? RegulatoryDomainEnums.CrossValidationStatus.PASSED
                : RegulatoryDomainEnums.CrossValidationStatus.FAILED;
        regulatoryReturn.setCrossValidationStatus(status);
        returnRepository.save(regulatoryReturn);
        return RegulatoryResponses.ValidationResult.builder()
                .valid(errors.isEmpty())
                .errors(errors)
                .warnings(List.of())
                .crossValidationStatus(status)
                .build();
    }

    public byte[] exportReturn(Long returnId, RegulatoryDomainEnums.OutputFormat format) {
        RegulatoryReturn regulatoryReturn = returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "id", returnId));
        List<RegulatoryReturnLineItem> items = lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(returnId);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("returnRef", regulatoryReturn.getReturnRef());
        payload.put("templateCode", regulatoryReturn.getTemplateCode());
        payload.put("jurisdiction", regulatoryReturn.getJurisdiction().name());
        payload.put("returnType", regulatoryReturn.getReturnType().name());
        payload.put("periodFrom", regulatoryReturn.getPeriodFrom());
        payload.put("periodTo", regulatoryReturn.getPeriodTo());
        payload.put("reportingDate", regulatoryReturn.getReportingDate());
        payload.put("currencyCode", regulatoryReturn.getCurrencyCode());
        payload.put("lineItems", items.stream().map(this::toLineMap).toList());

        return switch (format) {
            case JSON -> writeJsonBytes(payload);
            case XML, XBRL -> toXml(payload).getBytes(StandardCharsets.UTF_8);
            case CSV -> toCsv(items).getBytes(StandardCharsets.UTF_8);
            case EXCEL -> toExcel(regulatoryReturn, items);
            case PDF -> toPdf(regulatoryReturn, items);
        };
    }

    @Transactional(readOnly = true)
    public RegulatoryResponses.TemplateComparisonResult compareTemplateVersions(String templateCode, int version1, int version2) {
        String prefix = templateCode.replaceAll("-V\\d+$", "");
        List<RegulatoryReturnTemplate> templates = templateRepository.findByTemplateCodeStartingWithOrderByVersionNumberAsc(prefix);
        RegulatoryReturnTemplate left = templates.stream()
                .filter(item -> item.getVersionNumber() == version1)
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturnTemplate", "version", version1));
        RegulatoryReturnTemplate right = templates.stream()
                .filter(item -> item.getVersionNumber() == version2)
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturnTemplate", "version", version2));
        Map<String, Map<String, Object>> leftLines = flattenLineDefinitions(left);
        Map<String, Map<String, Object>> rightLines = flattenLineDefinitions(right);
        Set<String> added = new LinkedHashSet<>(rightLines.keySet());
        added.removeAll(leftLines.keySet());
        Set<String> removed = new LinkedHashSet<>(leftLines.keySet());
        removed.removeAll(rightLines.keySet());
        List<String> changed = rightLines.keySet().stream()
                .filter(leftLines::containsKey)
                .filter(key -> !Objects.equals(rightLines.get(key), leftLines.get(key)))
                .sorted()
                .toList();
        List<String> changedValidations = compareJsonLists(left.getValidationRules(), right.getValidationRules());
        return RegulatoryResponses.TemplateComparisonResult.builder()
                .templateCode(prefix)
                .version1(version1)
                .version2(version2)
                .addedLines(new ArrayList<>(added))
                .removedLines(new ArrayList<>(removed))
                .changedLines(changed)
                .changedValidations(changedValidations)
                .build();
    }

    private RegulatoryReturn generateReturn(RegulatoryReturnTemplate template,
                                            LocalDate reportingDate,
                                            LocalDate periodFrom,
                                            LocalDate periodTo,
                                            boolean regeneration) {
        LocalDate effectiveReportingDate = reportingDate != null ? reportingDate : periodTo;
        RegulatoryReturn previous = returnRepository.findTopByTemplateCodeAndPeriodToBeforeOrderByPeriodToDesc(
                        template.getTemplateCode(), periodTo != null ? periodTo : effectiveReportingDate)
                .orElse(null);
        RegulatoryReturn regulatoryReturn = RegulatoryReturn.builder()
                .returnRef(buildReturnRef(template, effectiveReportingDate, periodFrom, periodTo))
                .templateId(template.getId())
                .templateCode(template.getTemplateCode())
                .jurisdiction(template.getJurisdiction())
                .returnType(template.getReturnType())
                .reportingPeriodType(template.getReportingFrequency())
                .periodFrom(periodFrom != null ? periodFrom : effectiveReportingDate.withDayOfMonth(1))
                .periodTo(periodTo != null ? periodTo : effectiveReportingDate)
                .reportingDate(effectiveReportingDate)
                .currencyCode(defaultCurrency(template.getJurisdiction()))
                .dataExtractionStatus(RegulatoryDomainEnums.DataExtractionStatus.IN_PROGRESS)
                .validationStatus(RegulatoryDomainEnums.ReturnValidationStatus.NOT_VALIDATED)
                .crossValidationStatus(RegulatoryDomainEnums.CrossValidationStatus.NOT_CHECKED)
                .status(RegulatoryDomainEnums.ReturnStatus.GENERATED)
                .generatedBy(currentActor())
                .generatedAt(LocalDateTime.now())
                .filingDeadline((periodTo != null ? periodTo : effectiveReportingDate)
                        .plusDays(template.getFilingDeadlineDaysAfterPeriod()))
                .previousPeriodReturnId(previous != null ? previous.getId() : null)
                .tenantId(currentTenantId())
                .build();
        RegulatoryReturn saved = returnRepository.save(regulatoryReturn);
        persistLineItems(saved, template, effectiveReportingDate, saved.getPeriodFrom(), saved.getPeriodTo(), Map.of(), regeneration);
        RegulatoryReturn refreshed = returnRepository.findById(saved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "id", saved.getId()));
        recordAudit(refreshed.getId(), RegulatoryDomainEnums.AuditEventType.GENERATED, Map.of(
                "templateCode", refreshed.getTemplateCode(),
                "periodFrom", refreshed.getPeriodFrom(),
                "periodTo", refreshed.getPeriodTo()
        ));
        return refreshed;
    }

    private void persistLineItems(RegulatoryReturn regulatoryReturn,
                                  RegulatoryReturnTemplate template,
                                  LocalDate reportingDate,
                                  LocalDate periodFrom,
                                  LocalDate periodTo,
                                  Map<String, String> manualOverrides,
                                  boolean regeneration) {
        List<Map<String, Object>> sections = template.getSections() != null ? template.getSections() : List.of();
        Map<String, Integer> lineOrder = lineOrder(sections);
        RegulatoryReturn previous = regulatoryReturn.getPreviousPeriodReturnId() != null
                ? returnRepository.findById(regulatoryReturn.getPreviousPeriodReturnId()).orElse(null)
                : null;
        Map<String, RegulatoryReturnLineItem> previousLines = previous == null ? Map.of()
                : lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(previous.getId()).stream()
                    .collect(Collectors.toMap(RegulatoryReturnLineItem::getLineNumber, item -> item, (a, b) -> b, LinkedHashMap::new));

        Map<String, BigDecimal> numericValues = new LinkedHashMap<>();
        List<RegulatoryReturnLineItem> lineItems = new ArrayList<>();
        for (Map<String, Object> section : sections.stream()
                .sorted(Comparator.comparingInt(item -> intValue(item.get("displayOrder"), 0)))
                .toList()) {
            String sectionCode = string(section.get("sectionCode"));
            List<Map<String, Object>> lines = lineDefinitions(section);
            for (Map<String, Object> definition : lines.stream()
                    .sorted(Comparator.comparingInt(item -> intValue(item.get("displayOrder"), 0)))
                    .toList()) {
                String lineNumber = string(definition.get("lineNumber"));
                Map<String, Object> extractionRule = map(definition.get("extractionRule"));
                String value = resolveLineValue(regulatoryReturn, template, lineNumber, extractionRule, numericValues, lineOrder);
                if (manualOverrides.containsKey(lineNumber)) {
                    value = manualOverrides.get(lineNumber);
                }
                BigDecimal numericValue = asDecimal(value);
                numericValues.put(lineNumber, numericValue);
                RegulatoryReturnLineItem lineItem = toLineItem(
                        regulatoryReturn.getId(), sectionCode, definition, extractionRule, value,
                        previousLines.get(lineNumber), manualOverrides.containsKey(lineNumber));
                lineItems.add(lineItemRepository.save(lineItem));
            }
        }

        Map<String, Object> returnData = new LinkedHashMap<>();
        returnData.put("sections", sections.stream().map(section -> {
            String sectionCode = string(section.get("sectionCode"));
            Map<String, Object> sectionPayload = new LinkedHashMap<>();
            sectionPayload.put("sectionCode", sectionCode);
            sectionPayload.put("sectionName", section.get("sectionName"));
            sectionPayload.put("lineItems", lineItems.stream()
                    .filter(item -> Objects.equals(item.getSectionCode(), sectionCode))
                    .map(this::toLineMap)
                    .toList());
            return sectionPayload;
        }).toList());
        regulatoryReturn.setReturnData(returnData);
        regulatoryReturn.setDataExtractionStatus(RegulatoryDomainEnums.DataExtractionStatus.COMPLETED);
        regulatoryReturn.setDataExtractedAt(LocalDateTime.now());
        regulatoryReturn.setDataExtractedBy(currentActor());
        RegulatoryResponses.ValidationResult validationResult = validate(template, lineItems, regulatoryReturn);
        regulatoryReturn.setValidationStatus(validationResult.isValid()
                ? (validationResult.getWarnings().isEmpty() ? RegulatoryDomainEnums.ReturnValidationStatus.VALID
                : RegulatoryDomainEnums.ReturnValidationStatus.WARNINGS)
                : RegulatoryDomainEnums.ReturnValidationStatus.INVALID);
        regulatoryReturn.setValidationErrors(Map.of("errors", validationResult.getErrors()));
        regulatoryReturn.setValidationWarnings(Map.of("warnings", validationResult.getWarnings()));
        regulatoryReturn.setCrossValidationStatus(validationResult.getCrossValidationStatus());
        regulatoryReturn.setDeadlineBreach(LocalDate.now().isAfter(regulatoryReturn.getFilingDeadline()));
        if (regeneration) {
            regulatoryReturn.setStatus(RegulatoryDomainEnums.ReturnStatus.REVISED);
        }
        returnRepository.save(regulatoryReturn);
    }

    private RegulatoryResponses.ValidationResult validate(RegulatoryReturnTemplate template,
                                                          List<RegulatoryReturnLineItem> items,
                                                          RegulatoryReturn regulatoryReturn) {
        List<Map<String, Object>> errors = new ArrayList<>();
        List<Map<String, Object>> warnings = new ArrayList<>();
        Map<String, BigDecimal> values = items.stream()
                .collect(Collectors.toMap(RegulatoryReturnLineItem::getLineNumber,
                        item -> asDecimal(item.getValue()), (a, b) -> b, LinkedHashMap::new));

        for (RegulatoryReturnLineItem item : items) {
            if (item.getDataType() == RegulatoryDomainEnums.ReturnLineDataType.AMOUNT && asDecimal(item.getValue()).compareTo(BigDecimal.ZERO) < 0
                    && !Boolean.TRUE.equals(item.getManualOverride())) {
                warnings.add(Map.of(
                        "lineNumber", item.getLineNumber(),
                        "message", "Negative amount detected"
                ));
            }
        }

        List<Map<String, Object>> templateRules = template.getValidationRules() != null ? template.getValidationRules() : List.of();
        for (Map<String, Object> rule : templateRules) {
            String expression = string(rule.get("expression"));
            if (!StringUtils.hasText(expression)) {
                continue;
            }
            boolean passed = evaluateValidationExpression(expression, values, lineOrder(template.getSections()));
            if (!passed) {
                Map<String, Object> payload = Map.of(
                        "rule", string(rule.get("ruleCode")),
                        "message", string(rule.get("message"))
                );
                if ("WARNING".equalsIgnoreCase(string(rule.get("severity")))) {
                    warnings.add(payload);
                } else {
                    errors.add(payload);
                }
            }
        }

        RegulatoryDomainEnums.CrossValidationStatus crossStatus = runInlineCrossValidations(template, regulatoryReturn, items, warnings, errors);
        return RegulatoryResponses.ValidationResult.builder()
                .valid(errors.isEmpty())
                .errors(errors)
                .warnings(warnings)
                .crossValidationStatus(crossStatus)
                .build();
    }

    private RegulatoryDomainEnums.CrossValidationStatus runInlineCrossValidations(RegulatoryReturnTemplate template,
                                                                                  RegulatoryReturn regulatoryReturn,
                                                                                  List<RegulatoryReturnLineItem> items,
                                                                                  List<Map<String, Object>> warnings,
                                                                                  List<Map<String, Object>> errors) {
        List<Map<String, Object>> crossValidations = template.getCrossValidations() != null ? template.getCrossValidations() : List.of();
        if (crossValidations.isEmpty()) {
            return RegulatoryDomainEnums.CrossValidationStatus.NOT_CHECKED;
        }
        Map<String, RegulatoryReturnLineItem> currentItems = items.stream()
                .collect(Collectors.toMap(RegulatoryReturnLineItem::getLineNumber, item -> item, (a, b) -> b));
        boolean failed = false;
        for (Map<String, Object> validation : crossValidations) {
            String otherTemplate = string(validation.get("otherTemplate"));
            List<RegulatoryReturn> related = returnRepository.findByTemplateCodeAndPeriodFromAndPeriodToOrderByReturnDataVersionDesc(
                    otherTemplate, regulatoryReturn.getPeriodFrom(), regulatoryReturn.getPeriodTo());
            if (related.isEmpty()) {
                continue;
            }
            RegulatoryReturnLineItem left = currentItems.get(string(validation.get("thisLine")));
            RegulatoryReturnLineItem right = lineItemRepository.findByReturnIdAndLineNumber(related.getFirst().getId(), string(validation.get("otherLine")))
                    .orElse(null);
            if (left == null || right == null) {
                continue;
            }
            boolean matched = compare(asDecimal(left.getValue()), asDecimal(right.getValue()), string(validation.get("operator")));
            if (!matched) {
                failed = true;
                errors.add(Map.of(
                        "rule", "CROSS_VALIDATION",
                        "message", string(validation.get("message"))
                ));
            }
        }
        return failed ? RegulatoryDomainEnums.CrossValidationStatus.FAILED : RegulatoryDomainEnums.CrossValidationStatus.PASSED;
    }

    private RegulatoryReturnLineItem toLineItem(Long returnId,
                                                String sectionCode,
                                                Map<String, Object> definition,
                                                Map<String, Object> extractionRule,
                                                String value,
                                                RegulatoryReturnLineItem previous,
                                                boolean override) {
        String previousValue = previous != null ? previous.getValue() : null;
        BigDecimal currentDecimal = asDecimal(value);
        BigDecimal previousDecimal = asDecimal(previousValue);
        BigDecimal variance = currentDecimal.subtract(previousDecimal);
        BigDecimal variancePct = previousDecimal.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : variance.multiply(HUNDRED).divide(previousDecimal.abs(), 6, RoundingMode.HALF_UP);
        return RegulatoryReturnLineItem.builder()
                .returnId(returnId)
                .lineNumber(string(definition.get("lineNumber")))
                .sectionCode(sectionCode)
                .lineDescription(string(definition.get("description")))
                .lineDescriptionAr(string(definition.get("descriptionAr")))
                .dataType(parseEnum(RegulatoryDomainEnums.ReturnLineDataType.class, string(definition.get("dataType")),
                        RegulatoryDomainEnums.ReturnLineDataType.AMOUNT))
                .value(value)
                .previousPeriodValue(previousValue)
                .variance(variance.toPlainString())
                .variancePercentage(variancePct)
                .sourceType(parseEnum(RegulatoryDomainEnums.ReturnSourceType.class, string(extractionRule.get("type")),
                        RegulatoryDomainEnums.ReturnSourceType.MANUAL))
                .sourceGlAccountCode(extractionRule.get("glAccountCodes") instanceof List<?> glCodes
                        ? glCodes.stream().map(String::valueOf).collect(Collectors.joining(","))
                        : string(extractionRule.get("glAccountCodes")))
                .sourceQuery(string(extractionRule.get("filter")))
                .calculationFormula(string(extractionRule.get("formula")))
                .manualOverride(override)
                .isValid(true)
                .build();
    }

    private String resolveLineValue(RegulatoryReturn regulatoryReturn,
                                    RegulatoryReturnTemplate template,
                                    String lineNumber,
                                    Map<String, Object> extractionRule,
                                    Map<String, BigDecimal> numericValues,
                                    Map<String, Integer> lineOrder) {
        RegulatoryDomainEnums.ReturnSourceType type = parseEnum(RegulatoryDomainEnums.ReturnSourceType.class,
                string(extractionRule.get("type")), RegulatoryDomainEnums.ReturnSourceType.MANUAL);
        BigDecimal value = switch (type) {
            case GL_BALANCE -> extractionService.extractGlBalance(strings(extractionRule.get("glAccountCodes")),
                    regulatoryReturn.getReportingDate(), string(extractionRule.get("balanceType")));
            case GL_MOVEMENT -> extractionService.extractGlMovement(strings(extractionRule.get("glAccountCodes")),
                    regulatoryReturn.getPeriodFrom(), regulatoryReturn.getPeriodTo(), string(extractionRule.get("movementType")));
            case CALCULATED -> evaluateNumericExpression(string(extractionRule.get("formula")), numericValues, lineOrder);
            case ENTITY_QUERY -> extractEntityQuery(extractionRule, regulatoryReturn.getReportingDate());
            case ENTITY_COUNT -> BigDecimal.valueOf(extractionService.extractFinancingCount(
                    contractTypeFromEntity(string(extractionRule.get("entityType"))), string(extractionRule.get("filter"))));
            case CROSS_REFERENCE -> extractCrossReference(extractionRule, regulatoryReturn.getPeriodFrom(), regulatoryReturn.getPeriodTo());
            case CONSTANT -> asDecimal(extractionRule.get("value"));
            case ECL_DATA -> extractEclData(extractionRule, regulatoryReturn.getReportingDate());
            case POOL_DATA -> extractPoolData(extractionRule, regulatoryReturn.getPeriodFrom(), regulatoryReturn.getPeriodTo(), regulatoryReturn.getReportingDate());
            case MANUAL -> null;
        };
        return value != null ? value.setScale(2, RoundingMode.HALF_UP).toPlainString() : null;
    }

    private BigDecimal extractEntityQuery(Map<String, Object> extractionRule, LocalDate reportingDate) {
        String entityType = string(extractionRule.get("entityType"));
        String contractType = contractTypeFromEntity(entityType);
        String field = string(extractionRule.get("field"));
        String filter = string(extractionRule.get("filter"));
        String status = filterStatus(filter);
        return extractionService.extractFinancingTotal(contractType, status, field, reportingDate);
    }

    private BigDecimal extractCrossReference(Map<String, Object> extractionRule, LocalDate periodFrom, LocalDate periodTo) {
        List<RegulatoryReturn> related = returnRepository.findByTemplateCodeAndPeriodFromAndPeriodToOrderByReturnDataVersionDesc(
                string(extractionRule.get("returnTemplate")), periodFrom, periodTo);
        if (related.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return lineItemRepository.findByReturnIdAndLineNumber(related.getFirst().getId(), string(extractionRule.get("lineNumber")))
                .map(item -> asDecimal(item.getValue()))
                .orElse(BigDecimal.ZERO);
    }

    private BigDecimal extractEclData(Map<String, Object> extractionRule, LocalDate reportingDate) {
        String metric = string(extractionRule.get("metric"));
        String contractType = string(extractionRule.get("contractType"));
        String stage = string(extractionRule.get("stage"));
        return switch (metric != null ? metric.toUpperCase(Locale.ROOT) : "TOTAL_ECL") {
            case "TOTAL_ECL" -> extractionService.extractTotalEcl(contractType, reportingDate);
            case "PROVISION_COVERAGE" -> extractionService.extractProvisionCoverage(contractType, reportingDate);
            default -> extractionService.extractEclByStage(contractType, stage, reportingDate);
        };
    }

    private BigDecimal extractPoolData(Map<String, Object> extractionRule,
                                       LocalDate periodFrom,
                                       LocalDate periodTo,
                                       LocalDate reportingDate) {
        String metric = string(extractionRule.get("metric"));
        String poolType = string(extractionRule.get("poolType"));
        if ("TOTAL_BALANCE".equalsIgnoreCase(metric)) {
            return extractionService.extractPoolBalance(poolType, reportingDate);
        }
        Map<String, BigDecimal> distribution = extractionService.extractPoolProfitDistribution(
                string(extractionRule.get("poolCode")), periodFrom, periodTo);
        return distribution.getOrDefault(metric != null ? metric.toUpperCase(Locale.ROOT) : "GROSS_INCOME", BigDecimal.ZERO);
    }

    private void recalculateCalculatedLines(RegulatoryReturn regulatoryReturn, RegulatoryReturnTemplate template) {
        Map<String, Integer> order = lineOrder(template.getSections());
        List<RegulatoryReturnLineItem> items = lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(regulatoryReturn.getId());
        Map<String, RegulatoryReturnLineItem> byLine = items.stream()
                .collect(Collectors.toMap(RegulatoryReturnLineItem::getLineNumber, item -> item, (a, b) -> b, LinkedHashMap::new));
        Map<String, BigDecimal> values = byLine.values().stream()
                .collect(Collectors.toMap(RegulatoryReturnLineItem::getLineNumber, item -> asDecimal(item.getValue()), (a, b) -> b, LinkedHashMap::new));
        for (Map<String, Object> section : template.getSections()) {
            for (Map<String, Object> definition : lineDefinitions(section)) {
                String lineNumber = string(definition.get("lineNumber"));
                Map<String, Object> extractionRule = map(definition.get("extractionRule"));
                RegulatoryDomainEnums.ReturnSourceType type = parseEnum(RegulatoryDomainEnums.ReturnSourceType.class,
                        string(extractionRule.get("type")), RegulatoryDomainEnums.ReturnSourceType.MANUAL);
                if (type != RegulatoryDomainEnums.ReturnSourceType.CALCULATED) {
                    continue;
                }
                RegulatoryReturnLineItem lineItem = byLine.get(lineNumber);
                if (lineItem == null || Boolean.TRUE.equals(lineItem.getManualOverride())) {
                    continue;
                }
                BigDecimal value = evaluateNumericExpression(string(extractionRule.get("formula")), values, order);
                lineItem.setValue(value.setScale(2, RoundingMode.HALF_UP).toPlainString());
                lineItemRepository.save(lineItem);
                values.put(lineNumber, value);
            }
        }
        List<RegulatoryReturnLineItem> refreshed = lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(regulatoryReturn.getId());
        List<Map<String, Object>> sections = template.getSections() != null ? template.getSections() : List.of();
        List<Map<String, Object>> payloadSections = sections.stream().map(section -> {
            String sectionCode = string(section.get("sectionCode"));
            Map<String, Object> sectionPayload = new LinkedHashMap<>();
            sectionPayload.put("sectionCode", sectionCode);
            sectionPayload.put("sectionName", section.get("sectionName"));
            sectionPayload.put("lineItems", refreshed.stream()
                    .filter(item -> Objects.equals(item.getSectionCode(), sectionCode))
                    .map(this::toLineMap)
                    .toList());
            return sectionPayload;
        }).toList();
        regulatoryReturn.setReturnData(Map.of("sections", payloadSections));
        returnRepository.save(regulatoryReturn);
    }

    private Map<String, Integer> lineOrder(List<Map<String, Object>> sections) {
        AtomicInteger counter = new AtomicInteger(0);
        Map<String, Integer> order = new LinkedHashMap<>();
        if (sections == null) {
            return order;
        }
        for (Map<String, Object> section : sections.stream()
                .sorted(Comparator.comparingInt(item -> intValue(item.get("displayOrder"), 0)))
                .toList()) {
            for (Map<String, Object> line : lineDefinitions(section).stream()
                    .sorted(Comparator.comparingInt(item -> intValue(item.get("displayOrder"), 0)))
                    .toList()) {
                order.put(string(line.get("lineNumber")), counter.incrementAndGet());
            }
        }
        return order;
    }

    private Map<String, Map<String, Object>> flattenLineDefinitions(RegulatoryReturnTemplate template) {
        Map<String, Map<String, Object>> lines = new LinkedHashMap<>();
        if (template.getSections() == null) {
            return lines;
        }
        for (Map<String, Object> section : template.getSections()) {
            for (Map<String, Object> line : lineDefinitions(section)) {
                lines.put(string(line.get("lineNumber")), line);
            }
        }
        return lines;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> lineDefinitions(Map<String, Object> section) {
        Object raw = section.get("lineItems");
        if (raw instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    private List<String> strings(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        if (value != null) {
            return List.of(String.valueOf(value));
        }
        return List.of();
    }

    private String filterStatus(String filter) {
        if (!StringUtils.hasText(filter) || !filter.toUpperCase(Locale.ROOT).contains("STATUS=")) {
            return null;
        }
        String raw = filter.substring(filter.toUpperCase(Locale.ROOT).indexOf("STATUS=") + 7);
        return raw.split("AND")[0].trim();
    }

    private boolean evaluateValidationExpression(String expression,
                                                 Map<String, BigDecimal> values,
                                                 Map<String, Integer> lineOrder) {
        if (expression.contains("==")) {
            String[] parts = expression.split("==", 2);
            return evaluateNumericExpression(parts[0], values, lineOrder)
                    .compareTo(evaluateNumericExpression(parts[1], values, lineOrder)) == 0;
        }
        if (expression.contains(">=")) {
            String[] parts = expression.split(">=", 2);
            return evaluateNumericExpression(parts[0], values, lineOrder)
                    .compareTo(evaluateNumericExpression(parts[1], values, lineOrder)) >= 0;
        }
        if (expression.contains("<=")) {
            String[] parts = expression.split("<=", 2);
            return evaluateNumericExpression(parts[0], values, lineOrder)
                    .compareTo(evaluateNumericExpression(parts[1], values, lineOrder)) <= 0;
        }
        return evaluateNumericExpression(expression, values, lineOrder).compareTo(BigDecimal.ZERO) != 0;
    }

    private BigDecimal evaluateNumericExpression(String expression,
                                                 Map<String, BigDecimal> values,
                                                 Map<String, Integer> lineOrder) {
        if (!StringUtils.hasText(expression)) {
            return BigDecimal.ZERO;
        }
        String prepared = expression.toUpperCase(Locale.ROOT).replace(" ", "");
        Matcher matcher = SUM_RANGE.matcher(prepared);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            BigDecimal sum = sumRange(matcher.group(1), matcher.group(2), values, lineOrder);
            matcher.appendReplacement(buffer, sum.toPlainString());
        }
        matcher.appendTail(buffer);
        prepared = buffer.toString();
        List<String> refs = values.keySet().stream()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .toList();
        for (String ref : refs) {
            prepared = prepared.replace(ref.toUpperCase(Locale.ROOT), values.getOrDefault(ref, BigDecimal.ZERO).toPlainString());
        }
        try {
            Object value = expressionParser.parseExpression(prepared).getValue();
            return asDecimal(value).setScale(6, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            throw new BusinessException("Unable to evaluate formula: " + expression, "REG_TEMPLATE_FORMULA_ERROR");
        }
    }

    private BigDecimal sumRange(String from,
                                String to,
                                Map<String, BigDecimal> values,
                                Map<String, Integer> lineOrder) {
        int start = lineOrder.getOrDefault(from, Integer.MAX_VALUE);
        int end = lineOrder.getOrDefault(to, Integer.MIN_VALUE);
        if (start == Integer.MAX_VALUE || end == Integer.MIN_VALUE) {
            return BigDecimal.ZERO;
        }
        return lineOrder.entrySet().stream()
                .filter(entry -> entry.getValue() >= Math.min(start, end) && entry.getValue() <= Math.max(start, end))
                .map(entry -> values.getOrDefault(entry.getKey(), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean compare(BigDecimal left, BigDecimal right, String operator) {
        String normalized = operator != null ? operator.toUpperCase(Locale.ROOT) : "EQUALS";
        return switch (normalized) {
            case "GTE", ">=" -> left.compareTo(right) >= 0;
            case "LTE", "<=" -> left.compareTo(right) <= 0;
            case "GT", ">" -> left.compareTo(right) > 0;
            case "LT", "<" -> left.compareTo(right) < 0;
            default -> left.compareTo(right) == 0;
        };
    }

    private Map<String, Object> toLineMap(RegulatoryReturnLineItem item) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("lineNumber", item.getLineNumber());
        map.put("sectionCode", item.getSectionCode());
        map.put("lineDescription", item.getLineDescription());
        map.put("value", item.getValue());
        map.put("previousPeriodValue", item.getPreviousPeriodValue());
        map.put("variance", item.getVariance());
        map.put("variancePercentage", item.getVariancePercentage());
        map.put("manualOverride", item.getManualOverride());
        return map;
    }

    private String toCsv(List<RegulatoryReturnLineItem> items) {
        StringBuilder builder = new StringBuilder("section,line_number,description,value,previous_value,variance\n");
        for (RegulatoryReturnLineItem item : items) {
            builder.append(csv(item.getSectionCode())).append(',')
                    .append(csv(item.getLineNumber())).append(',')
                    .append(csv(item.getLineDescription())).append(',')
                    .append(csv(item.getValue())).append(',')
                    .append(csv(item.getPreviousPeriodValue())).append(',')
                    .append(csv(item.getVariance())).append('\n');
        }
        return builder.toString();
    }

    private String toXml(Map<String, Object> payload) {
        StringBuilder builder = new StringBuilder("<regulatoryReturn>");
        payload.forEach((key, value) -> {
            if ("lineItems".equals(key) && value instanceof List<?> list) {
                builder.append("<lineItems>");
                for (Object item : list) {
                    builder.append("<lineItem>");
                    map(item).forEach((itemKey, itemValue) ->
                            builder.append("<").append(itemKey).append(">")
                                    .append(escapeXml(String.valueOf(itemValue)))
                                    .append("</").append(itemKey).append(">"));
                    builder.append("</lineItem>");
                }
                builder.append("</lineItems>");
            } else {
                builder.append("<").append(key).append(">")
                        .append(escapeXml(String.valueOf(value)))
                        .append("</").append(key).append(">");
            }
        });
        builder.append("</regulatoryReturn>");
        return builder.toString();
    }

    private byte[] toExcel(RegulatoryReturn regulatoryReturn, List<RegulatoryReturnLineItem> items) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Return");
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            int rowIdx = 0;
            sheet.createRow(rowIdx++).createCell(0).setCellValue("Return Ref");
            sheet.getRow(0).createCell(1).setCellValue(regulatoryReturn.getReturnRef());
            sheet.createRow(rowIdx++).createCell(0).setCellValue("Template");
            sheet.getRow(1).createCell(1).setCellValue(regulatoryReturn.getTemplateCode());
            rowIdx++;

            String[] headers = {"Section", "Line Number", "Description", "Value", "Previous Value", "Variance"};
            var headerRow = sheet.createRow(rowIdx++);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            for (RegulatoryReturnLineItem item : items) {
                var row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(string(item.getSectionCode()));
                row.createCell(1).setCellValue(string(item.getLineNumber()));
                row.createCell(2).setCellValue(string(item.getLineDescription()));
                row.createCell(3).setCellValue(string(item.getValue()));
                row.createCell(4).setCellValue(string(item.getPreviousPeriodValue()));
                row.createCell(5).setCellValue(string(item.getVariance()));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new BusinessException("Unable to export regulatory return to Excel", "REG_TEMPLATE_EXCEL_EXPORT_ERROR");
        }
    }

    private byte[] toPdf(RegulatoryReturn regulatoryReturn, List<RegulatoryReturnLineItem> items) {
        String text = regulatoryReturn.getReturnRef() + "\\n" + items.stream()
                .map(item -> item.getLineNumber() + " " + item.getLineDescription() + " " + item.getValue())
                .collect(Collectors.joining("\\n"));
        String escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
        String content = "BT /F1 10 Tf 50 780 Td (" + escaped + ") Tj ET";
        byte[] contentBytes = content.getBytes(StandardCharsets.UTF_8);
        String pdf = "%PDF-1.4\n" +
                "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
                "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n" +
                "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n" +
                "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n" +
                "5 0 obj << /Length " + contentBytes.length + " >> stream\n" +
                content + "\nendstream endobj\n" +
                "xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000243 00000 n \n0000000313 00000 n \n" +
                "trailer << /Root 1 0 R /Size 6 >>\nstartxref\n" +
                (313 + contentBytes.length) + "\n%%EOF";
        return pdf.getBytes(StandardCharsets.UTF_8);
    }

    private byte[] writeJsonBytes(Map<String, Object> payload) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(payload);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("Unable to export regulatory return to JSON", "REG_TEMPLATE_JSON_EXPORT_ERROR");
        }
    }

    private List<String> compareJsonLists(List<Map<String, Object>> left, List<Map<String, Object>> right) {
        List<Map<String, Object>> safeLeft = left != null ? left : List.of();
        List<Map<String, Object>> safeRight = right != null ? right : List.of();
        List<String> changes = new ArrayList<>();
        int max = Math.max(safeLeft.size(), safeRight.size());
        for (int i = 0; i < max; i++) {
            Map<String, Object> leftItem = i < safeLeft.size() ? safeLeft.get(i) : Map.of();
            Map<String, Object> rightItem = i < safeRight.size() ? safeRight.get(i) : Map.of();
            if (!Objects.equals(leftItem, rightItem)) {
                changes.add("validation[" + i + "]");
            }
        }
        return changes;
    }

    private void recordAudit(Long returnId, RegulatoryDomainEnums.AuditEventType eventType, Map<String, Object> details) {
        auditEventRepository.save(ReturnAuditEvent.builder()
                .returnId(returnId)
                .eventType(eventType)
                .eventTimestamp(LocalDateTime.now())
                .performedBy(currentActor())
                .details(details)
                .build());
    }

    private String buildReturnRef(RegulatoryReturnTemplate template, LocalDate reportingDate, LocalDate periodFrom, LocalDate periodTo) {
        return template.getJurisdiction().name() + "-" + template.getReturnType().name() + "-" +
                (periodTo != null ? periodTo : reportingDate) + "-" + System.nanoTime();
    }

    private String defaultCurrency(RegulatoryDomainEnums.Jurisdiction jurisdiction) {
        return switch (jurisdiction) {
            case SA_SAMA -> "SAR";
            case AE_CBUAE -> "AED";
            case QA_QCB -> "QAR";
            case BH_CBB -> "BHD";
            case KW_CBK -> "KWD";
            case OM_CBO -> "OMR";
            case NG_CBN -> "NGN";
        };
    }

    private String nextTemplateCode(String currentCode, int version) {
        Matcher matcher = VERSION_SUFFIX.matcher(currentCode);
        if (matcher.find()) {
            return matcher.replaceFirst("-V" + version);
        }
        return currentCode + "-V" + version;
    }

    private Long currentTenantId() {
        return tenantResolver.getCurrentTenantIdOrDefault(1L);
    }

    private String currentActor() {
        return actorProvider.getCurrentActor();
    }

    private String contractTypeFromEntity(String entityType) {
        String normalized = entityType != null ? entityType.toUpperCase(Locale.ROOT) : "";
        if (normalized.contains("IJARAH")) {
            return "IJARAH";
        }
        if (normalized.contains("MUSHARAKAH")) {
            return "MUSHARAKAH";
        }
        return "MURABAHA";
    }

    private BigDecimal asDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return new BigDecimal(text.trim().replace(",", ""));
            } catch (NumberFormatException ex) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    private String string(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String csv(String value) {
        if (value == null) {
            return "";
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private String escapeXml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private int intValue(Object value, int defaultValue) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            return Integer.parseInt(text.trim());
        }
        return defaultValue;
    }

    private <E extends Enum<E>> E parseEnum(Class<E> enumClass, String value) {
        return parseEnum(enumClass, value, null);
    }

    private <E extends Enum<E>> E parseEnum(Class<E> enumClass, String value, E defaultValue) {
        if (!StringUtils.hasText(value)) {
            return defaultValue;
        }
        return Enum.valueOf(enumClass, value.trim().toUpperCase(Locale.ROOT));
    }

    private <E extends Enum<E>> E parseEnum(Class<E> enumClass, E value, E defaultValue) {
        return value != null ? value : defaultValue;
    }
}
