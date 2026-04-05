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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class RegulatoryReturnWorkflowService {

    private final RegulatoryReturnRepository returnRepository;
    private final RegulatoryReturnLineItemRepository lineItemRepository;
    private final RegulatoryReturnTemplateRepository templateRepository;
    private final ReturnAuditEventRepository auditEventRepository;
    private final RegulatoryTemplateEngine templateEngine;
    private final RegulatorySubmissionClient submissionClient;
    private final RegulatoryDeadlineService deadlineService;
    private final RegulatoryReferenceService referenceService;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    @Transactional(readOnly = true)
    public RegulatoryReturn getReturn(Long returnId) {
        return returnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "id", returnId));
    }

    @Transactional(readOnly = true)
    public RegulatoryReturn getReturnByRef(String ref) {
        return returnRepository.findByReturnRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturn", "returnRef", ref));
    }

    @Transactional(readOnly = true)
    public List<RegulatoryReturn> getReturnsByJurisdiction(String jurisdiction, LocalDate from, LocalDate to) {
        return returnRepository.findByJurisdictionAndPeriodFromBetweenOrderByPeriodFromDesc(
                RegulatoryDomainEnums.Jurisdiction.valueOf(jurisdiction.toUpperCase(Locale.ROOT)),
                from, to);
    }

    @Transactional(readOnly = true)
    public List<RegulatoryReturn> getReturnsByStatus(RegulatoryDomainEnums.ReturnStatus status) {
        return returnRepository.findByStatusOrderByFilingDeadlineAsc(status);
    }

    public void submitForReview(Long returnId) {
        RegulatoryReturn regulatoryReturn = getReturn(returnId);
        regulatoryReturn.setStatus(RegulatoryDomainEnums.ReturnStatus.UNDER_REVIEW);
        returnRepository.save(regulatoryReturn);
        audit(returnId, RegulatoryDomainEnums.AuditEventType.REVIEWED, Map.of("status", "UNDER_REVIEW"));
    }

    public void reviewReturn(Long returnId, RegulatoryRequests.ReviewDetails details) {
        RegulatoryReturn regulatoryReturn = getReturn(returnId);
        regulatoryReturn.setReviewedBy(details.getReviewer() != null ? details.getReviewer() : currentActor());
        regulatoryReturn.setReviewedAt(LocalDateTime.now());
        if (details.getComments() != null) {
            regulatoryReturn.setRegulatorFeedback(details.getComments());
        }
        regulatoryReturn.setStatus(RegulatoryDomainEnums.ReturnStatus.VALIDATED);
        returnRepository.save(regulatoryReturn);
        audit(returnId, RegulatoryDomainEnums.AuditEventType.REVIEWED, auditDetails("comments", details.getComments()));
    }

    public void approveReturn(Long returnId, String approvedBy) {
        RegulatoryReturn regulatoryReturn = getReturn(returnId);
        String approver = approvedBy != null ? approvedBy : currentActor();
        if (Objects.equals(approver, regulatoryReturn.getGeneratedBy())) {
            throw new BusinessException("Approver must be different from generator", "REG_FOUR_EYES_VIOLATION");
        }
        regulatoryReturn.setApprovedBy(approver);
        regulatoryReturn.setApprovedAt(LocalDateTime.now());
        regulatoryReturn.setStatus(RegulatoryDomainEnums.ReturnStatus.APPROVED);
        returnRepository.save(regulatoryReturn);
        audit(returnId, RegulatoryDomainEnums.AuditEventType.APPROVED, Map.of("approvedBy", approver));
    }

    public void submitToRegulator(Long returnId, RegulatoryRequests.SubmissionDetails details) {
        RegulatoryReturn regulatoryReturn = getReturn(returnId);
        if (regulatoryReturn.getStatus() != RegulatoryDomainEnums.ReturnStatus.APPROVED) {
            throw new BusinessException("Return must be approved before submission", "REG_RETURN_NOT_APPROVED");
        }
        RegulatoryReturnTemplate template = templateRepository.findById(regulatoryReturn.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryReturnTemplate", "id", regulatoryReturn.getTemplateId()));
        RegulatoryTemplateEngine.ExportArtifact artifact = templateEngine.prepareExportArtifact(returnId, template.getOutputFormat());
        RegulatorySubmissionClient.SubmissionResult result = submissionClient.submit(
                template, regulatoryReturn, artifact, details, currentTenantId());
        regulatoryReturn.setSubmittedBy(details != null && StringUtils.hasText(details.getSubmittedBy()) ? details.getSubmittedBy() : currentActor());
        regulatoryReturn.setSubmittedAt(result.submittedAt());
        regulatoryReturn.setSubmissionMethod(resolveSubmissionMethod(template, details));
        regulatoryReturn.setRegulatorReferenceNumber(StringUtils.hasText(result.regulatorReferenceNumber())
                ? result.regulatorReferenceNumber()
                : (details != null ? details.getRegulatorReferenceNumber() : null));
        regulatoryReturn.setSubmissionPayload(writeSubmissionPayload(artifact));
        regulatoryReturn.setSubmissionResponse(auditDetails(
                "success", result.success(),
                "preparedOnly", result.preparedOnly(),
                "endpoint", result.endpoint(),
                "contentType", result.contentType(),
                "statusCode", result.statusCode(),
                "responseBody", result.responseBody(),
                "responseHeaders", result.responseHeaders(),
                "durationMs", result.durationMs()
        ));
        regulatoryReturn.setSubmissionAttemptCount((regulatoryReturn.getSubmissionAttemptCount() != null
                ? regulatoryReturn.getSubmissionAttemptCount() : 0) + 1);
        regulatoryReturn.setStatus(result.success()
                ? RegulatoryDomainEnums.ReturnStatus.SUBMITTED
                : RegulatoryDomainEnums.ReturnStatus.APPROVED);
        regulatoryReturn.setRegulatorFeedback(result.success() ? regulatoryReturn.getRegulatorFeedback() : result.responseBody());
        returnRepository.save(regulatoryReturn);
        audit(returnId, RegulatoryDomainEnums.AuditEventType.SUBMITTED, auditDetails(
                "method", regulatoryReturn.getSubmissionMethod() != null ? regulatoryReturn.getSubmissionMethod().name() : null,
                "regulatorReferenceNumber", regulatoryReturn.getRegulatorReferenceNumber(),
                "endpoint", result.endpoint(),
                "statusCode", result.statusCode(),
                "success", result.success()
        ));
        if (!result.success()) {
            throw new BusinessException("Regulator submission failed: " + result.responseBody(), "REG_SUBMISSION_FAILED");
        }
    }

    public void recordAcknowledgment(Long returnId, RegulatoryRequests.AcknowledgmentDetails details) {
        RegulatoryReturn regulatoryReturn = getReturn(returnId);
        regulatoryReturn.setRegulatorReferenceNumber(details.getRegulatorReferenceNumber());
        regulatoryReturn.setRegulatorAcknowledgedAt(LocalDateTime.now());
        regulatoryReturn.setRegulatorFeedback(details.getFeedback());
        regulatoryReturn.setStatus(RegulatoryDomainEnums.ReturnStatus.ACKNOWLEDGED);
        returnRepository.save(regulatoryReturn);
        audit(returnId, RegulatoryDomainEnums.AuditEventType.ACKNOWLEDGED, auditDetails(
                "regulatorReferenceNumber", details.getRegulatorReferenceNumber(),
                "feedback", details.getFeedback()
        ));
    }

    public void recordRejection(Long returnId, RegulatoryRequests.RejectionDetails details) {
        RegulatoryReturn regulatoryReturn = getReturn(returnId);
        regulatoryReturn.setRegulatorFeedback(details.getFeedback());
        regulatoryReturn.setStatus(RegulatoryDomainEnums.ReturnStatus.REJECTED_BY_REGULATOR);
        returnRepository.save(regulatoryReturn);
        audit(returnId, RegulatoryDomainEnums.AuditEventType.REJECTED, auditDetails(
                "feedback", details.getFeedback(),
                "rejectedBy", details.getRejectedBy()
        ));
    }

    public RegulatoryReturn createAmendment(Long originalReturnId, String reason) {
        RegulatoryReturn original = getReturn(originalReturnId);
        RegulatoryReturn amendment = RegulatoryReturn.builder()
                .returnRef(referenceService.nextAmendmentRef(original.getReturnRef()))
                .templateId(original.getTemplateId())
                .templateCode(original.getTemplateCode())
                .jurisdiction(original.getJurisdiction())
                .returnType(original.getReturnType())
                .reportingPeriodType(original.getReportingPeriodType())
                .periodFrom(original.getPeriodFrom())
                .periodTo(original.getPeriodTo())
                .reportingDate(original.getReportingDate())
                .currencyCode(original.getCurrencyCode())
                .dataExtractionStatus(original.getDataExtractionStatus())
                .dataExtractedAt(original.getDataExtractedAt())
                .dataExtractedBy(original.getDataExtractedBy())
                .returnData(original.getReturnData())
                .returnDataVersion(1)
                .validationStatus(original.getValidationStatus())
                .validationErrors(original.getValidationErrors())
                .validationWarnings(original.getValidationWarnings())
                .crossValidationStatus(original.getCrossValidationStatus())
                .status(RegulatoryDomainEnums.ReturnStatus.DRAFT)
                .generatedBy(currentActor())
                .generatedAt(LocalDateTime.now())
                .submissionAttemptCount(0)
                .filingDeadline(original.getFilingDeadline())
                .isAmendment(true)
                .originalReturnId(originalReturnId)
                .amendmentReason(reason)
                .tenantId(currentTenantId())
                .build();
        RegulatoryReturn saved = returnRepository.save(amendment);
        for (RegulatoryReturnLineItem item : lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(originalReturnId)) {
            lineItemRepository.save(RegulatoryReturnLineItem.builder()
                    .returnId(saved.getId())
                    .lineNumber(item.getLineNumber())
                    .sectionCode(item.getSectionCode())
                    .lineDescription(item.getLineDescription())
                    .lineDescriptionAr(item.getLineDescriptionAr())
                    .dataType(item.getDataType())
                    .value(item.getValue())
                    .previousPeriodValue(item.getPreviousPeriodValue())
                    .variance(item.getVariance())
                    .variancePercentage(item.getVariancePercentage())
                    .sourceType(item.getSourceType())
                    .sourceGlAccountCode(item.getSourceGlAccountCode())
                    .sourceQuery(item.getSourceQuery())
                    .calculationFormula(item.getCalculationFormula())
                    .manualOverride(item.getManualOverride())
                    .manualOverrideBy(item.getManualOverrideBy())
                    .manualOverrideReason(item.getManualOverrideReason())
                    .isValid(item.getIsValid())
                    .validationMessage(item.getValidationMessage())
                    .build());
        }
        audit(saved.getId(), RegulatoryDomainEnums.AuditEventType.AMENDED, auditDetails(
                "originalReturnId", originalReturnId,
                "reason", reason
        ));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<RegulatoryReturn> getUpcomingDeadlines(int daysAhead) {
        return returnRepository.findByFilingDeadlineBetweenOrderByFilingDeadlineAsc(LocalDate.now(), LocalDate.now().plusDays(daysAhead)).stream()
                .filter(item -> !deadlineService.isOverdue(item, LocalDate.now().minusDays(1)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RegulatoryReturn> getBreachedDeadlines() {
        List<RegulatoryReturn> overdue = new ArrayList<>();
        for (RegulatoryReturn regulatoryReturn : returnRepository.findAll()) {
            if (deadlineService.isOverdue(regulatoryReturn, LocalDate.now())) {
                regulatoryReturn.setDeadlineBreach(true);
                overdue.add(regulatoryReturn);
            }
        }
        return overdue;
    }

    public void sendDeadlineReminders() {
        for (RegulatoryReturn regulatoryReturn : getUpcomingDeadlines(7)) {
            audit(regulatoryReturn.getId(), RegulatoryDomainEnums.AuditEventType.VALIDATED, Map.of(
                    "reminder", "deadline approaching",
                    "filingDeadline", regulatoryReturn.getFilingDeadline()
            ));
        }
    }

    @Transactional(readOnly = true)
    public List<RegulatoryResponses.RegulatoryCalendarEntry> getRegulatoryCalendar(String jurisdiction, int year) {
        RegulatoryDomainEnums.Jurisdiction resolved = RegulatoryDomainEnums.Jurisdiction.valueOf(jurisdiction.toUpperCase(Locale.ROOT));
        List<RegulatoryResponses.RegulatoryCalendarEntry> entries = new ArrayList<>();
        for (RegulatoryReturnTemplate template : templateRepository.findByJurisdictionAndIsActiveTrueOrderByReturnTypeAscVersionNumberDesc(resolved)) {
            entries.addAll(calendarEntries(template, year));
        }
        return entries;
    }

    @Transactional(readOnly = true)
    public List<ReturnAuditEvent> getReturnAuditTrail(Long returnId) {
        return auditEventRepository.findByReturnIdOrderByEventTimestampAsc(returnId);
    }

    @Transactional(readOnly = true)
    public RegulatoryResponses.ReturnComparison comparePeriods(Long currentReturnId, Long previousReturnId) {
        List<RegulatoryReturnLineItem> current = lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(currentReturnId);
        Map<String, RegulatoryReturnLineItem> previous = lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(previousReturnId).stream()
                .collect(java.util.stream.Collectors.toMap(RegulatoryReturnLineItem::getLineNumber, item -> item, (a, b) -> b));
        List<Map<String, Object>> variances = new ArrayList<>();
        for (RegulatoryReturnLineItem currentItem : current) {
            RegulatoryReturnLineItem previousItem = previous.get(currentItem.getLineNumber());
            BigDecimal currentValue = decimal(currentItem.getValue());
            BigDecimal previousValue = previousItem != null ? decimal(previousItem.getValue()) : BigDecimal.ZERO;
            BigDecimal variancePct = previousValue.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                    : currentValue.subtract(previousValue).multiply(new BigDecimal("100"))
                    .divide(previousValue.abs(), 2, RoundingMode.HALF_UP);
            if (variancePct.abs().compareTo(new BigDecimal("5.00")) >= 0) {
                variances.add(Map.of(
                        "lineNumber", currentItem.getLineNumber(),
                        "currentValue", currentValue,
                        "previousValue", previousValue,
                        "variancePercentage", variancePct
                ));
            }
        }
        return RegulatoryResponses.ReturnComparison.builder()
                .currentReturnId(currentReturnId)
                .previousReturnId(previousReturnId)
                .variances(variances)
                .build();
    }

    @Transactional(readOnly = true)
    public RegulatoryResponses.RegulatoryReportingDashboard getDashboard() {
        List<RegulatoryReturn> returns = returnRepository.findAll();
        Map<String, Long> byStatus = returns.stream()
                .collect(java.util.stream.Collectors.groupingBy(item -> item.getStatus().name(), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        Map<String, Long> byJurisdiction = returns.stream()
                .collect(java.util.stream.Collectors.groupingBy(item -> item.getJurisdiction().name(), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        long onTime = returns.stream()
                .filter(item -> item.getSubmittedAt() != null)
                .filter(item -> !item.getSubmittedAt().toLocalDate().isAfter(item.getFilingDeadline()))
                .count();
        long totalDue = returns.size();
        BigDecimal complianceRate = totalDue == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(onTime).multiply(new BigDecimal("100"))
                .divide(BigDecimal.valueOf(totalDue), 2, RoundingMode.HALF_UP);
        return RegulatoryResponses.RegulatoryReportingDashboard.builder()
                .returnsByStatus(byStatus)
                .upcomingDeadlines(getUpcomingDeadlines(7).size())
                .breachedDeadlines(getBreachedDeadlines().size())
                .byJurisdiction(byJurisdiction)
                .complianceRate(complianceRate)
                .build();
    }

    private List<RegulatoryResponses.RegulatoryCalendarEntry> calendarEntries(RegulatoryReturnTemplate template, int year) {
        List<RegulatoryResponses.RegulatoryCalendarEntry> entries = new ArrayList<>();
        int step = switch (template.getReportingFrequency()) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMI_ANNUAL -> 6;
            case ANNUAL -> 12;
            case AD_HOC -> 12;
        };
        for (int month = 1; month <= 12; month += step) {
            LocalDate periodFrom = LocalDate.of(year, month, 1);
            LocalDate periodTo = switch (template.getReportingFrequency()) {
                case MONTHLY -> periodFrom.withDayOfMonth(periodFrom.lengthOfMonth());
                case QUARTERLY -> periodFrom.plusMonths(2).withDayOfMonth(periodFrom.plusMonths(2).lengthOfMonth());
                case SEMI_ANNUAL -> periodFrom.plusMonths(5).withDayOfMonth(periodFrom.plusMonths(5).lengthOfMonth());
                case ANNUAL, AD_HOC -> LocalDate.of(year, 12, 31);
            };
            List<RegulatoryReturn> existing = returnRepository.findByTemplateCodeAndPeriodFromAndPeriodToOrderByReturnDataVersionDesc(
                    template.getTemplateCode(), periodFrom, periodTo);
            RegulatoryReturn current = existing.isEmpty() ? null : existing.getFirst();
            String status = current == null
                    ? (deadlineService.isOverdue(RegulatoryReturn.builder()
                        .status(RegulatoryDomainEnums.ReturnStatus.DRAFT)
                        .filingDeadline(deadlineService.calculateDeadline(template, periodTo))
                        .build(), LocalDate.now()) ? "OVERDUE" : "UPCOMING")
                    : current.getStatus().name();
            entries.add(RegulatoryResponses.RegulatoryCalendarEntry.builder()
                    .templateCode(template.getTemplateCode())
                    .returnType(template.getReturnType().name())
                    .jurisdiction(template.getJurisdiction().name())
                    .periodFrom(periodFrom)
                    .periodTo(periodTo)
                    .filingDeadline(deadlineService.calculateDeadline(template, periodTo))
                    .status(status)
                    .returnId(current != null ? current.getId() : null)
                    .build());
            if (template.getReportingFrequency() == RegulatoryDomainEnums.ReportingPeriodType.ANNUAL
                    || template.getReportingFrequency() == RegulatoryDomainEnums.ReportingPeriodType.AD_HOC) {
                break;
            }
        }
        return entries;
    }

    private void audit(Long returnId, RegulatoryDomainEnums.AuditEventType eventType, Map<String, Object> details) {
        auditEventRepository.save(ReturnAuditEvent.builder()
                .returnId(returnId)
                .eventType(eventType)
                .eventTimestamp(LocalDateTime.now())
                .performedBy(currentActor())
                .details(details)
                .build());
    }

    private String currentActor() {
        return actorProvider.getCurrentActor();
    }

    private Long currentTenantId() {
        return tenantResolver.getCurrentTenantIdOrDefault(1L);
    }

    private BigDecimal decimal(String value) {
        if (value == null || value.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }

    private RegulatoryDomainEnums.SubmissionMethod resolveSubmissionMethod(RegulatoryReturnTemplate template,
                                                                          RegulatoryRequests.SubmissionDetails details) {
        if (details != null && StringUtils.hasText(details.getSubmissionMethod())) {
            return RegulatoryDomainEnums.SubmissionMethod.valueOf(details.getSubmissionMethod().toUpperCase(Locale.ROOT));
        }
        if (template.getSubmissionConfig() != null && template.getSubmissionConfig().get("defaultMethod") != null) {
            return RegulatoryDomainEnums.SubmissionMethod.valueOf(
                    String.valueOf(template.getSubmissionConfig().get("defaultMethod")).toUpperCase(Locale.ROOT));
        }
        return RegulatoryDomainEnums.SubmissionMethod.API;
    }

    private String writeSubmissionPayload(RegulatoryTemplateEngine.ExportArtifact artifact) {
        if (artifact == null || artifact.body() == null) {
            return null;
        }
        if (artifact.contentType() != null && (
                artifact.contentType().contains("json")
                        || artifact.contentType().contains("xml")
                        || artifact.contentType().contains("csv")
                        || artifact.contentType().contains("text")
                        || artifact.contentType().contains("pdf"))) {
            return new String(artifact.body(), StandardCharsets.UTF_8);
        }
        return Base64.getEncoder().encodeToString(artifact.body());
    }

    private Map<String, Object> auditDetails(Object... entries) {
        Map<String, Object> details = new LinkedHashMap<>();
        for (int index = 0; index < entries.length - 1; index += 2) {
            details.put(String.valueOf(entries[index]), entries[index + 1]);
        }
        return details;
    }
}
