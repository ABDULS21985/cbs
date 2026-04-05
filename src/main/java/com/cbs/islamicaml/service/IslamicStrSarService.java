package com.cbs.islamicaml.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.*;
import com.cbs.islamicaml.repository.IslamicAmlAlertRepository;
import com.cbs.islamicaml.repository.IslamicStrSarRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicStrSarService {

    private final IslamicStrSarRepository sarRepository;
    private final IslamicAmlAlertRepository alertRepository;
    private final CustomerRepository customerRepository;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    private static final AtomicLong SAR_SEQ = new AtomicLong(System.nanoTime());

    // ===================== CREATE SAR =====================

    public IslamicStrSarResponse createSar(CreateSarRequest request) {
        if (request == null) {
            throw new BusinessException("SAR request must not be null", "SAR_REQUEST_NULL");
        }

        Customer customer = customerRepository.findById(request.getSubjectCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer not found: " + request.getSubjectCustomerId()));

        SarType sarType;
        try {
            sarType = SarType.valueOf(request.getSarType());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid SAR type: " + request.getSarType(), "INVALID_SAR_TYPE");
        }

        // Accept jurisdiction from request, default to SA_SAFIU
        SarJurisdiction jurisdiction;
        if (StringUtils.hasText(request.getJurisdiction())) {
            try {
                jurisdiction = SarJurisdiction.valueOf(request.getJurisdiction());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Invalid jurisdiction: " + request.getJurisdiction(), "INVALID_JURISDICTION");
            }
        } else {
            jurisdiction = SarJurisdiction.SA_SAFIU;
        }

        LocalDate filingDeadline = calculateFilingDeadline(jurisdiction, request.isUrgent());

        String customerName = buildCustomerDisplayName(customer);

        IslamicStrSar sar = IslamicStrSar.builder()
                .sarRef("SAR-" + LocalDate.now().getYear() + "-"
                        + String.format("%06d", SAR_SEQ.incrementAndGet()))
                .sarType(sarType)
                .jurisdiction(jurisdiction)
                .templateVersion("1.0")
                .subjectCustomerId(customer.getId())
                .subjectCustomerName(customerName)
                .subjectCustomerType(customer.getCustomerType() != null
                        ? customer.getCustomerType().name() : "INDIVIDUAL")
                .subjectNationality(customer.getNationality())
                .islamicProductInvolved(request.getIslamicProductInvolved())
                .islamicContractRef(request.getIslamicContractRef())
                .islamicTypology(request.getIslamicTypology())
                .suspiciousTransactions(request.getSuspiciousTransactions())
                .totalSuspiciousAmount(Optional.ofNullable(request.getTotalSuspiciousAmount())
                        .orElse(BigDecimal.ZERO))
                .suspiciousPeriodFrom(request.getSuspiciousPeriodFrom())
                .suspiciousPeriodTo(request.getSuspiciousPeriodTo())
                .narrativeSummary(request.getNarrativeSummary())
                .suspiciousIndicators(request.getSuspiciousIndicators())
                .status(SarStatus.DRAFT)
                .preparedBy(actorProvider.getCurrentActor())
                .preparedAt(LocalDateTime.now())
                .linkedAlertIds(request.getLinkedAlertIds())
                .filingDeadline(filingDeadline)
                .isUrgent(request.isUrgent())
                .deadlineBreach(false)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();

        sar = sarRepository.save(sar);
        log.info("SAR created: ref={}, type={}, customer={}, jurisdiction={}, deadline={}",
                sar.getSarRef(), sarType, customerName, jurisdiction, filingDeadline);

        return toResponse(sar);
    }

    // ===================== REVIEW SAR =====================

    public IslamicStrSarResponse reviewSar(Long sarId, SarReviewRequest request) {
        IslamicStrSar sar = sarRepository.findById(sarId)
                .orElseThrow(() -> new ResourceNotFoundException("SAR not found: " + sarId));

        if (sar.getStatus() != SarStatus.DRAFT && sar.getStatus() != SarStatus.RETURNED_FOR_REVISION) {
            throw new BusinessException(
                    "SAR " + sarId + " cannot be reviewed in status: " + sar.getStatus()
                            + ". Only DRAFT or RETURNED_FOR_REVISION SARs can be reviewed.",
                    "INVALID_SAR_STATUS_FOR_REVIEW");
        }

        sar.setReviewedBy(actorProvider.getCurrentActor());
        sar.setReviewedAt(LocalDateTime.now());
        sar.setStatus(SarStatus.UNDER_REVIEW);

        // Append review notes to the narrative if provided
        if (StringUtils.hasText(request.getReviewNotes())) {
            String existingNarrative = Optional.ofNullable(sar.getNarrativeSummary()).orElse("");
            sar.setNarrativeSummary(existingNarrative
                    + "\n\n--- Reviewer Notes (" + actorProvider.getCurrentActor() + ") ---\n"
                    + request.getReviewNotes());
        }

        sar = sarRepository.save(sar);
        log.info("SAR {} reviewed by {}, status moved to UNDER_REVIEW", sarId, actorProvider.getCurrentActor());

        return toResponse(sar);
    }

    // ===================== MLRO APPROVE =====================

    public void mlroApprove(Long sarId, String mlroId) {
        IslamicStrSar sar = sarRepository.findById(sarId)
                .orElseThrow(() -> new ResourceNotFoundException("SAR not found: " + sarId));

        if (sar.getStatus() != SarStatus.UNDER_REVIEW) {
            throw new BusinessException(
                    "SAR " + sarId + " cannot be approved in status: " + sar.getStatus()
                            + ". Only UNDER_REVIEW SARs can be approved by MLRO.",
                    "INVALID_SAR_STATUS_FOR_APPROVAL");
        }

        sar.setMlroApprovedBy(StringUtils.hasText(mlroId) ? mlroId : actorProvider.getCurrentActor());
        sar.setMlroApprovedAt(LocalDateTime.now());
        sar.setStatus(SarStatus.APPROVED_FOR_FILING);

        sarRepository.save(sar);
        log.info("SAR {} approved by MLRO {}, status moved to APPROVED_FOR_FILING", sarId, sar.getMlroApprovedBy());
    }

    // ===================== RETURN FOR REVISION =====================

    public IslamicStrSarResponse returnForRevision(Long sarId, String reason) {
        IslamicStrSar sar = sarRepository.findById(sarId)
                .orElseThrow(() -> new ResourceNotFoundException("SAR not found: " + sarId));

        if (sar.getStatus() != SarStatus.UNDER_REVIEW && sar.getStatus() != SarStatus.APPROVED_FOR_FILING) {
            throw new BusinessException(
                    "SAR " + sarId + " cannot be returned for revision in status: " + sar.getStatus(),
                    "INVALID_SAR_STATUS_FOR_RETURN");
        }

        sar.setStatus(SarStatus.RETURNED_FOR_REVISION);
        // Reset review/approval fields so the SAR can be re-reviewed
        sar.setReviewedBy(null);
        sar.setReviewedAt(null);
        sar.setMlroApprovedBy(null);
        sar.setMlroApprovedAt(null);

        if (StringUtils.hasText(reason)) {
            String existingNarrative = Optional.ofNullable(sar.getNarrativeSummary()).orElse("");
            sar.setNarrativeSummary(existingNarrative
                    + "\n\n--- Returned for Revision by " + actorProvider.getCurrentActor() + " ---\n"
                    + reason);
        }

        sar = sarRepository.save(sar);
        log.info("SAR {} returned for revision by {} — reason: {}", sarId, actorProvider.getCurrentActor(), reason);
        return toResponse(sar);
    }

    // ===================== FILE SAR =====================

    public void fileSar(Long sarId) {
        IslamicStrSar sar = sarRepository.findById(sarId)
                .orElseThrow(() -> new ResourceNotFoundException("SAR not found: " + sarId));

        if (sar.getStatus() != SarStatus.APPROVED_FOR_FILING) {
            throw new BusinessException(
                    "SAR " + sarId + " cannot be filed in status: " + sar.getStatus()
                            + ". Only APPROVED_FOR_FILING SARs can be filed.",
                    "INVALID_SAR_STATUS_FOR_FILING");
        }

        sar.setFiledAt(LocalDateTime.now());
        sar.setStatus(SarStatus.FILED);

        // Determine filing method based on jurisdiction
        SarFilingMethod filingMethod = switch (sar.getJurisdiction()) {
            case SA_SAFIU -> SarFilingMethod.SAFIU_PORTAL;
            case AE_GOAML -> SarFilingMethod.GOAML_PORTAL;
            default -> SarFilingMethod.MANUAL_SUBMISSION;
        };
        sar.setFiledVia(filingMethod);

        // Check if filing is past deadline
        if (sar.getFilingDeadline() != null
                && LocalDate.now().isAfter(sar.getFilingDeadline())) {
            sar.setDeadlineBreach(true);
            log.warn("SAR {} filed PAST deadline. Deadline was {}, filed on {}",
                    sarId, sar.getFilingDeadline(), LocalDate.now());
        }

        // Update linked alerts with SAR reference
        if (sar.getLinkedAlertIds() != null) {
            for (Long alertId : sar.getLinkedAlertIds()) {
                alertRepository.findById(alertId).ifPresent(alert -> {
                    alert.setSarFiled(true);
                    alert.setSarReference(sar.getSarRef());
                    alert.setStatus(IslamicAmlAlertStatus.SAR_FILED);
                    alertRepository.save(alert);
                });
            }
        }

        sarRepository.save(sar);
        log.info("SAR {} filed via {}, deadlineBreach={}", sarId, filingMethod, sar.isDeadlineBreach());
        log.warn("AUDIT: SAR filed - ref={}, jurisdiction={}, subject={}, amount={}, actor={}",
                sar.getSarRef(), sar.getJurisdiction(), sar.getSubjectCustomerName(),
                sar.getTotalSuspiciousAmount(), actorProvider.getCurrentActor());
    }

    // ===================== FIU RESPONSE =====================

    public void recordFiuResponse(Long sarId, FiuResponseDetails response) {
        IslamicStrSar sar = sarRepository.findById(sarId)
                .orElseThrow(() -> new ResourceNotFoundException("SAR not found: " + sarId));

        if (sar.getStatus() != SarStatus.FILED && sar.getStatus() != SarStatus.ACKNOWLEDGED) {
            throw new BusinessException(
                    "SAR " + sarId + " is not in a valid status for FIU response: " + sar.getStatus(),
                    "INVALID_SAR_STATUS_FOR_FIU_RESPONSE");
        }

        if (StringUtils.hasText(response.getFiuReferenceNumber())) {
            sar.setFiuReferenceNumber(response.getFiuReferenceNumber());
        }
        if (StringUtils.hasText(response.getResponseNotes())) {
            sar.setFiuResponseNotes(response.getResponseNotes());
        }

        if (response.isAcknowledged()) {
            sar.setFiuAcknowledgedAt(LocalDateTime.now());
            sar.setStatus(SarStatus.ACKNOWLEDGED);
        }

        sarRepository.save(sar);
        log.info("FIU response recorded for SAR {}: fiuRef={}, acknowledged={}",
                sarId, response.getFiuReferenceNumber(), response.isAcknowledged());
    }

    // ===================== AUTO-GENERATE SAR FROM ALERT =====================

    public IslamicStrSarResponse autoGenerateSar(Long alertId) {
        IslamicAmlAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));

        Customer customer = customerRepository.findById(alert.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer not found for alert: " + alert.getCustomerId()));

        // Build professional SAR narrative following GCC FIU template structure
        StringBuilder narrative = new StringBuilder();

        // Section 1: Subject identification
        narrative.append("SUBJECT IDENTIFICATION\n");
        narrative.append(String.format("Name: %s\n", alert.getCustomerName() != null ? alert.getCustomerName() : "Unknown"));
        narrative.append(String.format("Customer ID: %s\n", alert.getCustomerId()));
        narrative.append(String.format("Alert Reference: %s\n\n", alert.getAlertRef()));

        // Section 2: Suspicious activity summary
        narrative.append("SUSPICIOUS ACTIVITY SUMMARY\n");
        narrative.append(String.format("Detection Date: %s\n", alert.getDetectionDate()));
        narrative.append(String.format("Rule Triggered: %s\n", alert.getRuleCode()));
        if (alert.getIslamicContext() != null) {
            Object typology = alert.getIslamicContext().get("typology");
            if (typology != null) {
                narrative.append(String.format("Islamic Typology: %s\n", typology));
            }
            Object timeline = alert.getIslamicContext().get("timelineDescription");
            if (timeline != null) {
                narrative.append(String.format("Timeline: %s\n", timeline));
            }
        }
        narrative.append(String.format("Total Amount Involved: %s %s\n\n",
                alert.getTotalAmountInvolved() != null ? alert.getTotalAmountInvolved() : "N/A",
                alert.getCurrencyCode() != null ? alert.getCurrencyCode() : "SAR"));

        // Section 3: Transaction details
        narrative.append("TRANSACTION DETAILS\n");
        if (alert.getInvolvedTransactions() != null && !alert.getInvolvedTransactions().isEmpty()) {
            narrative.append("Involved Transactions:\n");
            for (String txn : alert.getInvolvedTransactions()) {
                narrative.append(String.format("  - %s\n", txn));
            }
        }
        if (alert.getInvolvedContracts() != null && !alert.getInvolvedContracts().isEmpty()) {
            narrative.append("Involved Contracts:\n");
            for (String contract : alert.getInvolvedContracts()) {
                narrative.append(String.format("  - %s\n", contract));
            }
        }
        narrative.append("\n");

        // Section 4: Suspicious indicators
        narrative.append("SUSPICIOUS INDICATORS\n");
        List<String> indicators = new ArrayList<>();
        if (alert.getIslamicContext() != null) {
            Object suspIndicators = alert.getIslamicContext().get("suspiciousIndicators");
            if (suspIndicators instanceof List<?> indicatorList) {
                for (Object ind : indicatorList) {
                    indicators.add(ind.toString());
                    narrative.append(String.format("  - %s\n", ind));
                }
            }
        }
        // Add risk-score-based indicator
        if (alert.getRiskScore() != null && alert.getRiskScore().compareTo(new BigDecimal("80")) >= 0) {
            String highRiskIndicator = "High risk score: " + alert.getRiskScore();
            indicators.add(highRiskIndicator);
            narrative.append(String.format("  - %s\n", highRiskIndicator));
        }
        narrative.append("\n");

        // Section 5: Investigation notes
        narrative.append("INVESTIGATION NOTES\n");
        if (alert.getInvestigationNotes() != null) {
            narrative.append(alert.getInvestigationNotes()).append("\n");
        } else {
            narrative.append("Pending investigation.\n");
        }

        // Section 6: Conclusion
        narrative.append("\nCONCLUSION\n");
        narrative.append("Based on the above analysis, this activity is deemed suspicious and warrants filing with the relevant Financial Intelligence Unit.\n");

        // Derive Islamic-specific fields from alert context
        String islamicProductInvolved = alert.getIslamicContext() != null
                ? (String) alert.getIslamicContext().get("productCode") : null;
        String islamicTypology = alert.getIslamicContext() != null
                && alert.getIslamicContext().get("typology") != null
                ? alert.getIslamicContext().get("typology").toString()
                : (alert.getRuleCode() != null ? alert.getRuleCode() : "GENERAL");
        String islamicContractRef = alert.getInvolvedContracts() != null && !alert.getInvolvedContracts().isEmpty()
                ? alert.getInvolvedContracts().get(0) : null;

        SarJurisdiction jurisdiction = resolveJurisdictionFromCountry(customer.getNationality(), customer.getCountryOfResidence());
        boolean isUrgent = alert.getRiskScore() != null
                && alert.getRiskScore().compareTo(new BigDecimal("90")) > 0;
        LocalDate filingDeadline = calculateFilingDeadline(jurisdiction, isUrgent);

        String customerName = buildCustomerDisplayName(customer);

        IslamicStrSar sar = IslamicStrSar.builder()
                .sarRef("SAR-" + LocalDate.now().getYear() + "-"
                        + String.format("%06d", SAR_SEQ.incrementAndGet()))
                .sarType(SarType.STR)
                .jurisdiction(jurisdiction)
                .templateVersion("1.0")
                .subjectCustomerId(customer.getId())
                .subjectCustomerName(customerName)
                .subjectCustomerType(customer.getCustomerType() != null
                        ? customer.getCustomerType().name() : "INDIVIDUAL")
                .subjectNationality(customer.getNationality())
                .islamicProductInvolved(islamicProductInvolved)
                .islamicContractRef(islamicContractRef)
                .islamicTypology(islamicTypology)
                .suspiciousTransactions(buildSuspiciousTransactionsFromAlert(alert))
                .totalSuspiciousAmount(Optional.ofNullable(alert.getTotalAmountInvolved()).orElse(BigDecimal.ZERO))
                .suspiciousPeriodFrom(alert.getDetectionDate() != null
                        ? alert.getDetectionDate().toLocalDate().minusDays(90) : LocalDate.now().minusDays(90))
                .suspiciousPeriodTo(alert.getDetectionDate() != null
                        ? alert.getDetectionDate().toLocalDate() : LocalDate.now())
                .narrativeSummary(narrative.toString())
                .suspiciousIndicators(indicators)
                .status(SarStatus.DRAFT)
                .preparedBy(actorProvider.getCurrentActor())
                .preparedAt(LocalDateTime.now())
                .linkedAlertIds(List.of(alertId))
                .filingDeadline(filingDeadline)
                .isUrgent(isUrgent)
                .deadlineBreach(false)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();

        sar = sarRepository.save(sar);
        log.info("SAR auto-generated from alert {}: sarRef={}, urgent={}", alertId, sar.getSarRef(), isUrgent);

        return toResponse(sar);
    }

    // ===================== DEADLINE QUERIES =====================

    @Transactional(readOnly = true)
    public List<IslamicStrSarResponse> getSarsApproachingDeadline(int daysAhead) {
        LocalDate deadline = LocalDate.now().plusDays(daysAhead);
        return sarRepository.findApproachingDeadline(deadline).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<IslamicStrSarResponse> getSarsBreachingDeadline() {
        return sarRepository.findBreachingDeadline().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ===================== BASIC QUERIES =====================

    @Transactional(readOnly = true)
    public IslamicStrSarResponse getSar(Long sarId) {
        IslamicStrSar sar = sarRepository.findById(sarId)
                .orElseThrow(() -> new ResourceNotFoundException("SAR not found: " + sarId));
        return toResponse(sar);
    }

    @Transactional(readOnly = true)
    public Page<IslamicStrSarResponse> searchSars(SarSearchCriteria criteria, Pageable pageable) {
        Specification<IslamicStrSar> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(criteria.getStatus())) {
                try {
                    predicates.add(cb.equal(root.get("status"), SarStatus.valueOf(criteria.getStatus())));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid SAR status filter '{}' - skipping predicate", criteria.getStatus());
                }
            }
            if (StringUtils.hasText(criteria.getJurisdiction())) {
                try {
                    predicates.add(cb.equal(root.get("jurisdiction"),
                            SarJurisdiction.valueOf(criteria.getJurisdiction())));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid jurisdiction filter '{}' - skipping predicate", criteria.getJurisdiction());
                }
            }
            if (criteria.getSubjectCustomerId() != null) {
                predicates.add(cb.equal(root.get("subjectCustomerId"), criteria.getSubjectCustomerId()));
            }
            if (criteria.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
                        criteria.getDateFrom().atStartOfDay(ZoneId.systemDefault()).toInstant()));
            }
            if (criteria.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"),
                        criteria.getDateTo().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant()));
            }
            if (StringUtils.hasText(criteria.getSarType())) {
                try {
                    predicates.add(cb.equal(root.get("sarType"), SarType.valueOf(criteria.getSarType())));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid SAR type filter '{}' - skipping predicate", criteria.getSarType());
                }
            }
            if (criteria.getIsUrgent() != null) {
                predicates.add(cb.equal(root.get("isUrgent"), criteria.getIsUrgent()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return sarRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public SarFilingSummary getFilingSummary(LocalDate from, LocalDate to) {
        List<IslamicStrSar> allSars = sarRepository.findAll();

        // Filter by date range
        List<IslamicStrSar> filtered = allSars.stream()
                .filter(s -> {
                    if (s.getCreatedAt() == null) return false;
                    LocalDate createdDate = s.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                    boolean afterFrom = from == null || !createdDate.isBefore(from);
                    boolean beforeTo = to == null || !createdDate.isAfter(to);
                    return afterFrom && beforeTo;
                })
                .collect(Collectors.toList());

        long totalFiled = filtered.stream()
                .filter(s -> s.getStatus() == SarStatus.FILED
                        || s.getStatus() == SarStatus.ACKNOWLEDGED
                        || s.getStatus() == SarStatus.CLOSED)
                .count();

        Map<String, Long> byJurisdiction = new LinkedHashMap<>();
        for (SarJurisdiction jur : SarJurisdiction.values()) {
            long count = filtered.stream()
                    .filter(s -> s.getJurisdiction() == jur)
                    .count();
            if (count > 0) {
                byJurisdiction.put(jur.name(), count);
            }
        }

        Map<String, Long> byTypology = new LinkedHashMap<>();
        for (IslamicStrSar s : filtered) {
            String typology = StringUtils.hasText(s.getIslamicTypology())
                    ? s.getIslamicTypology() : "UNSPECIFIED";
            byTypology.merge(typology, 1L, Long::sum);
        }

        // Calculate average filing days for filed SARs
        List<Long> filingDays = filtered.stream()
                .filter(s -> s.getFiledAt() != null && s.getPreparedAt() != null)
                .map(s -> ChronoUnit.DAYS.between(
                        s.getPreparedAt().toLocalDate(),
                        s.getFiledAt().toLocalDate()))
                .collect(Collectors.toList());

        BigDecimal averageFilingDays = filingDays.isEmpty() ? BigDecimal.ZERO
                : BigDecimal.valueOf(filingDays.stream().mapToLong(Long::longValue).sum())
                    .divide(BigDecimal.valueOf(filingDays.size()), 4, RoundingMode.HALF_UP);

        long deadlineBreaches = filtered.stream()
                .filter(IslamicStrSar::isDeadlineBreach)
                .count();

        long pendingMlroApproval = filtered.stream()
                .filter(s -> s.getStatus() == SarStatus.UNDER_REVIEW)
                .count();

        return SarFilingSummary.builder()
                .totalFiled(totalFiled)
                .byJurisdiction(byJurisdiction)
                .byTypology(byTypology)
                .averageFilingDays(averageFilingDays)
                .deadlineBreaches(deadlineBreaches)
                .pendingMlroApproval(pendingMlroApproval)
                .build();
    }

    // ===================== PRIVATE HELPERS =====================

    private SarJurisdiction resolveJurisdictionFromCountry(String nationality, String countryOfResidence) {
        String country = StringUtils.hasText(nationality) ? nationality.toUpperCase()
                : StringUtils.hasText(countryOfResidence) ? countryOfResidence.toUpperCase()
                : null;
        if (country == null) {
            return SarJurisdiction.SA_SAFIU;
        }
        return switch (country) {
            case "AE", "UAE" -> SarJurisdiction.AE_GOAML;
            case "QA", "QATAR" -> SarJurisdiction.QA_QFIU;
            case "BH", "BAHRAIN" -> SarJurisdiction.BH_CBB;
            case "KW", "KUWAIT" -> SarJurisdiction.KW_KFIU;
            case "OM", "OMAN" -> SarJurisdiction.OM_CBO;
            default -> SarJurisdiction.SA_SAFIU;
        };
    }

    private LocalDate calculateFilingDeadline(SarJurisdiction jurisdiction, boolean isUrgent) {
        if (isUrgent) {
            // Urgent filings: 1 business day for all jurisdictions
            return addBusinessDays(LocalDate.now(), 1);
        }

        int businessDays = switch (jurisdiction) {
            case SA_SAFIU -> 10;    // Saudi Arabia: 10 business days
            case AE_GOAML -> 3;     // UAE: 3 business days
            case QA_QFIU -> 5;      // Qatar: 5 business days
            case BH_CBB -> 5;       // Bahrain: 5 business days
            case KW_KFIU -> 5;      // Kuwait: 5 business days
            case OM_CBO -> 7;       // Oman: 7 business days
        };

        return addBusinessDays(LocalDate.now(), businessDays);
    }

    private LocalDate addBusinessDays(LocalDate startDate, int businessDays) {
        LocalDate result = startDate;
        int addedDays = 0;
        while (addedDays < businessDays) {
            result = result.plusDays(1);
            // Skip weekends (Friday and Saturday for GCC jurisdictions)
            if (result.getDayOfWeek().getValue() != 5 && result.getDayOfWeek().getValue() != 6) {
                addedDays++;
            }
        }
        return result;
    }

    private String buildCustomerDisplayName(Customer customer) {
        StringBuilder name = new StringBuilder();
        if (StringUtils.hasText(customer.getFirstName())) {
            name.append(customer.getFirstName());
        }
        if (StringUtils.hasText(customer.getMiddleName())) {
            if (name.length() > 0) name.append(" ");
            name.append(customer.getMiddleName());
        }
        if (StringUtils.hasText(customer.getLastName())) {
            if (name.length() > 0) name.append(" ");
            name.append(customer.getLastName());
        }
        if (name.length() == 0 && StringUtils.hasText(customer.getRegisteredName())) {
            name.append(customer.getRegisteredName());
        }
        return name.length() > 0 ? name.toString() : "Unknown";
    }

    private List<Map<String, Object>> buildSuspiciousTransactionsFromAlert(IslamicAmlAlert alert) {
        List<Map<String, Object>> transactions = new ArrayList<>();
        if (alert.getInvolvedTransactions() != null) {
            for (String txnRef : alert.getInvolvedTransactions()) {
                Map<String, Object> txn = new LinkedHashMap<>();
                txn.put("transactionRef", txnRef);
                txn.put("amount", alert.getTotalAmountInvolved());
                txn.put("currency", alert.getCurrencyCode() != null ? alert.getCurrencyCode() : "SAR");
                txn.put("detectionDate", alert.getDetectionDate() != null ? alert.getDetectionDate().toString() : null);
                txn.put("ruleCode", alert.getRuleCode());
                transactions.add(txn);
            }
        }
        if (alert.getInvolvedContracts() != null) {
            for (String contractRef : alert.getInvolvedContracts()) {
                Map<String, Object> txn = new LinkedHashMap<>();
                txn.put("contractRef", contractRef);
                txn.put("type", "CONTRACT");
                txn.put("ruleCode", alert.getRuleCode());
                transactions.add(txn);
            }
        }
        return transactions.isEmpty() ? null : transactions;
    }

    private IslamicStrSarResponse toResponse(IslamicStrSar s) {
        return IslamicStrSarResponse.builder()
                .id(s.getId())
                .baseSarId(s.getBaseSarId())
                .sarRef(s.getSarRef())
                .sarType(s.getSarType())
                .jurisdiction(s.getJurisdiction())
                .templateVersion(s.getTemplateVersion())
                .subjectCustomerId(s.getSubjectCustomerId())
                .subjectCustomerName(s.getSubjectCustomerName())
                .subjectCustomerType(s.getSubjectCustomerType())
                .subjectNationalId(s.getSubjectNationalId())
                .subjectPassportNumber(s.getSubjectPassportNumber())
                .subjectNationality(s.getSubjectNationality())
                .subjectAddress(s.getSubjectAddress())
                .islamicProductInvolved(s.getIslamicProductInvolved())
                .islamicContractRef(s.getIslamicContractRef())
                .islamicTypology(s.getIslamicTypology())
                .shariahComplianceAlert(s.getShariahComplianceAlert())
                .suspiciousTransactions(s.getSuspiciousTransactions())
                .totalSuspiciousAmount(s.getTotalSuspiciousAmount())
                .suspiciousPeriodFrom(s.getSuspiciousPeriodFrom())
                .suspiciousPeriodTo(s.getSuspiciousPeriodTo())
                .narrativeSummary(s.getNarrativeSummary())
                .suspiciousIndicators(s.getSuspiciousIndicators())
                .status(s.getStatus())
                .preparedBy(s.getPreparedBy())
                .preparedAt(s.getPreparedAt())
                .reviewedBy(s.getReviewedBy())
                .reviewedAt(s.getReviewedAt())
                .mlroApprovedBy(s.getMlroApprovedBy())
                .mlroApprovedAt(s.getMlroApprovedAt())
                .filedAt(s.getFiledAt())
                .filedVia(s.getFiledVia())
                .fiuReferenceNumber(s.getFiuReferenceNumber())
                .fiuAcknowledgedAt(s.getFiuAcknowledgedAt())
                .fiuResponseNotes(s.getFiuResponseNotes())
                .linkedAlertIds(s.getLinkedAlertIds())
                .linkedSanctionsResultIds(s.getLinkedSanctionsResultIds())
                .linkedShariahAlertIds(s.getLinkedShariahAlertIds())
                .filingDeadline(s.getFilingDeadline())
                .isUrgent(s.isUrgent())
                .deadlineBreach(s.isDeadlineBreach())
                .tenantId(s.getTenantId())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .createdBy(s.getCreatedBy())
                .updatedBy(s.getUpdatedBy())
                .build();
    }
}
