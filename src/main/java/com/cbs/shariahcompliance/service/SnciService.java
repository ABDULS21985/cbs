package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.shariahcompliance.dto.CreateSnciRecordRequest;
import com.cbs.shariahcompliance.dto.SnciRecordResponse;
import com.cbs.shariahcompliance.dto.SnciSearchCriteria;
import com.cbs.shariahcompliance.dto.SnciSummary;
import com.cbs.shariahcompliance.entity.DetectionMethod;
import com.cbs.shariahcompliance.entity.NonComplianceType;
import com.cbs.shariahcompliance.entity.QuarantineStatus;
import com.cbs.shariahcompliance.entity.ShariahComplianceAlert;
import com.cbs.shariahcompliance.entity.SnciRecord;
import com.cbs.shariahcompliance.repository.ShariahComplianceAlertRepository;
import com.cbs.shariahcompliance.repository.SnciRecordRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SnciService {

    private final SnciRecordRepository snciRepository;
    private final ShariahComplianceAlertRepository alertRepository;
    private final CurrentActorProvider actorProvider;

    private static final AtomicLong SNCI_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);
    private static final String SNCI_QUARANTINE_GL = "2350-000-001";

    // ── Detection ──────────────────────────────────────────────────────────────

    public SnciRecordResponse createSnciRecord(CreateSnciRecordRequest request) {
        String snciRef = "SNCI-" + Year.now().getValue() + "-" + String.format("%05d", SNCI_SEQ.incrementAndGet());

        SnciRecord record = SnciRecord.builder()
                .snciRef(snciRef)
                .detectionDate(LocalDate.now())
                .detectionMethod(DetectionMethod.valueOf(request.getDetectionMethod()))
                .detectionSource(request.getDetectionSource())
                .sourceTransactionRef(request.getSourceTransactionRef())
                .sourceContractRef(request.getSourceContractRef())
                .sourceContractType(request.getSourceContractType())
                .sourceAccountCode(request.getSourceAccountCode())
                .incomeType(request.getIncomeType())
                .amount(request.getAmount())
                .currencyCode(request.getCurrencyCode())
                .incomeDate(request.getIncomeDate())
                .nonComplianceType(NonComplianceType.valueOf(request.getNonComplianceType()))
                .nonComplianceDescription(request.getNonComplianceDescription())
                .shariahRuleViolated(request.getShariahRuleViolated())
                .quarantineStatus(QuarantineStatus.DETECTED)
                .build();

        if (request.getAlertId() != null) {
            ShariahComplianceAlert alert = alertRepository.findById(request.getAlertId())
                    .orElseThrow(() -> new ResourceNotFoundException("ShariahComplianceAlert", "id", request.getAlertId()));
            record.setAlertId(alert.getId());
            alert.setGeneratedSnciRecord(true);
            alert.setSnciRecordId(null); // will be set after save
        }

        SnciRecord saved = snciRepository.save(record);

        if (request.getAlertId() != null) {
            ShariahComplianceAlert alert = alertRepository.findById(request.getAlertId()).orElse(null);
            if (alert != null) {
                alert.setSnciRecordId(saved.getId());
                alertRepository.save(alert);
            }
        }

        log.info("Created SNCI record {} for amount {} {} — detection method: {}, non-compliance: {}",
                snciRef, saved.getAmount(), saved.getCurrencyCode(),
                saved.getDetectionMethod(), saved.getNonComplianceType());

        return toResponse(saved);
    }

    public List<SnciRecordResponse> runAutomatedDetection(LocalDate fromDate, LocalDate toDate) {
        log.info("Running automated SNCI detection for period {} to {}", fromDate, toDate);
        // Placeholder — in production, this would scan PoolIncomeRecord, fee income,
        // and cross-reference against current exclusion lists and fatwa statuses
        // to identify non-compliant income that requires quarantine.
        log.info("Automated detection complete for period {} to {} — no integrated income sources configured yet", fromDate, toDate);
        return List.of();
    }

    // ── Quarantine ─────────────────────────────────────────────────────────────

    public void quarantineIncome(Long snciId) {
        SnciRecord record = loadSnciRecord(snciId);

        if (record.getQuarantineStatus() != QuarantineStatus.DETECTED) {
            throw new BusinessException(
                    "SNCI record " + record.getSnciRef() + " cannot be quarantined — current status: " + record.getQuarantineStatus(),
                    "SNCI_INVALID_STATUS_FOR_QUARANTINE");
        }

        record.setQuarantineStatus(QuarantineStatus.QUARANTINED);
        record.setQuarantinedAt(LocalDateTime.now());
        record.setQuarantineGlAccount(SNCI_QUARANTINE_GL);

        // In a full implementation, GL posting would be done here via IslamicPostingRuleService:
        // DR source account (record.getSourceAccountCode())
        // CR SNCI quarantine holding account (SNCI_QUARANTINE_GL)
        // For now, record the quarantine without GL integration.

        snciRepository.save(record);

        log.info("Quarantined SNCI record {} — amount {} {} moved to quarantine GL {}",
                record.getSnciRef(), record.getAmount(), record.getCurrencyCode(), SNCI_QUARANTINE_GL);
    }

    public void batchQuarantine(List<Long> snciIds) {
        List<String> errors = new ArrayList<>();

        for (Long snciId : snciIds) {
            try {
                quarantineIncome(snciId);
            } catch (Exception e) {
                log.warn("Failed to quarantine SNCI record id={}: {}", snciId, e.getMessage());
                errors.add("SNCI id=" + snciId + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            log.warn("Batch quarantine completed with {} error(s) out of {} records", errors.size(), snciIds.size());
            if (errors.size() == snciIds.size()) {
                throw new BusinessException(
                        "Batch quarantine failed for all records: " + String.join("; ", errors),
                        "SNCI_BATCH_QUARANTINE_FAILED");
            }
        }

        log.info("Batch quarantine completed: {} of {} records quarantined successfully",
                snciIds.size() - errors.size(), snciIds.size());
    }

    // ── Dispute ────────────────────────────────────────────────────────────────

    public void disputeSnci(Long snciId, String disputedBy, String reason) {
        SnciRecord record = loadSnciRecord(snciId);

        if (record.getQuarantineStatus() == QuarantineStatus.PURIFIED) {
            throw new BusinessException(
                    "SNCI record " + record.getSnciRef() + " has already been purified and cannot be disputed",
                    "SNCI_ALREADY_PURIFIED");
        }

        if (record.getQuarantineStatus() == QuarantineStatus.WAIVED_BY_SSB) {
            throw new BusinessException(
                    "SNCI record " + record.getSnciRef() + " has been waived by SSB and cannot be disputed",
                    "SNCI_ALREADY_WAIVED");
        }

        record.setQuarantineStatus(QuarantineStatus.DISPUTED);
        record.setDisputedBy(disputedBy);
        record.setDisputeReason(reason);

        snciRepository.save(record);

        log.info("SNCI record {} disputed by {} — reason: {}", record.getSnciRef(), disputedBy, reason);
    }

    public void resolveDispute(Long snciId, boolean isNonCompliant, String resolvedBy, String resolution) {
        SnciRecord record = loadSnciRecord(snciId);

        if (record.getQuarantineStatus() != QuarantineStatus.DISPUTED) {
            throw new BusinessException(
                    "SNCI record " + record.getSnciRef() + " is not in DISPUTED status — current status: " + record.getQuarantineStatus(),
                    "SNCI_NOT_DISPUTED");
        }

        record.setDisputeResolvedBy(resolvedBy);
        record.setDisputeResolvedAt(LocalDateTime.now());

        if (isNonCompliant) {
            // Income confirmed as non-compliant — return to quarantine for purification
            record.setQuarantineStatus(QuarantineStatus.QUARANTINED);
            log.info("Dispute on SNCI {} resolved — confirmed non-compliant, returned to QUARANTINED by {}",
                    record.getSnciRef(), resolvedBy);
        } else {
            // Income found compliant — waive by SSB, reverse quarantine
            record.setQuarantineStatus(QuarantineStatus.WAIVED_BY_SSB);
            record.setQuarantineGlAccount(null);
            record.setQuarantinedAt(null);
            log.info("Dispute on SNCI {} resolved — found compliant, WAIVED_BY_SSB by {}",
                    record.getSnciRef(), resolvedBy);
        }

        snciRepository.save(record);
    }

    // ── Queries ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SnciRecordResponse getSnciRecord(Long snciId) {
        SnciRecord record = loadSnciRecord(snciId);
        return toResponse(record);
    }

    @Transactional(readOnly = true)
    public Page<SnciRecordResponse> searchSnci(SnciSearchCriteria criteria, Pageable pageable) {
        Specification<SnciRecord> spec = buildSpecification(criteria);
        return snciRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public SnciSummary getSnciSummary() {
        BigDecimal detectedAmount = snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DETECTED);
        BigDecimal quarantinedAmount = snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.QUARANTINED);
        BigDecimal pendingAmount = snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION);
        BigDecimal purifiedAmount = snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PURIFIED);
        BigDecimal disputedAmount = snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DISPUTED);

        BigDecimal totalAmount = detectedAmount.add(quarantinedAmount).add(pendingAmount)
                .add(purifiedAmount).add(disputedAmount);

        List<SnciRecord> allRecords = snciRepository.findAll();

        long detectedCount = 0;
        long quarantinedCount = 0;
        long pendingPurificationCount = 0;
        long purifiedCount = 0;
        long disputedCount = 0;
        Map<String, BigDecimal> byType = new HashMap<>();
        Map<String, BigDecimal> byStatus = new HashMap<>();

        for (SnciRecord r : allRecords) {
            switch (r.getQuarantineStatus()) {
                case DETECTED -> detectedCount++;
                case QUARANTINED -> quarantinedCount++;
                case PENDING_PURIFICATION -> pendingPurificationCount++;
                case PURIFIED -> purifiedCount++;
                case DISPUTED -> disputedCount++;
                default -> { /* PURIFICATION_APPROVED, WAIVED_BY_SSB */ }
            }

            String typeName = r.getNonComplianceType().name();
            byType.merge(typeName, r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO, BigDecimal::add);

            String statusName = r.getQuarantineStatus().name();
            byStatus.merge(statusName, r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO, BigDecimal::add);
        }

        return SnciSummary.builder()
                .totalAmount(totalAmount)
                .detectedCount(detectedCount)
                .quarantinedCount(quarantinedCount)
                .pendingPurificationCount(pendingPurificationCount)
                .purifiedCount(purifiedCount)
                .disputedCount(disputedCount)
                .byType(byType)
                .byStatus(byStatus)
                .build();
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalUnpurifiedSnci() {
        return snciRepository.sumTotalUnpurified();
    }

    @Transactional(readOnly = true)
    public List<SnciRecordResponse> getSnciPendingPurification() {
        List<SnciRecord> records = snciRepository.findByQuarantineStatusIn(
                List.of(QuarantineStatus.QUARANTINED, QuarantineStatus.PENDING_PURIFICATION));
        return records.stream().map(this::toResponse).toList();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private SnciRecord loadSnciRecord(Long snciId) {
        return snciRepository.findById(snciId)
                .orElseThrow(() -> new ResourceNotFoundException("SnciRecord", "id", snciId));
    }

    private Specification<SnciRecord> buildSpecification(SnciSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getQuarantineStatus() != null && !criteria.getQuarantineStatus().isBlank()) {
                predicates.add(cb.equal(root.get("quarantineStatus"),
                        QuarantineStatus.valueOf(criteria.getQuarantineStatus())));
            }

            if (criteria.getNonComplianceType() != null && !criteria.getNonComplianceType().isBlank()) {
                predicates.add(cb.equal(root.get("nonComplianceType"),
                        NonComplianceType.valueOf(criteria.getNonComplianceType())));
            }

            if (criteria.getDetectionMethod() != null && !criteria.getDetectionMethod().isBlank()) {
                predicates.add(cb.equal(root.get("detectionMethod"),
                        DetectionMethod.valueOf(criteria.getDetectionMethod())));
            }

            if (criteria.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("detectionDate"), criteria.getDateFrom()));
            }

            if (criteria.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("detectionDate"), criteria.getDateTo()));
            }

            if (criteria.getMinAmount() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), criteria.getMinAmount()));
            }

            if (criteria.getMaxAmount() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("amount"), criteria.getMaxAmount()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private SnciRecordResponse toResponse(SnciRecord r) {
        return SnciRecordResponse.builder()
                .id(r.getId())
                .snciRef(r.getSnciRef())
                .detectionDate(r.getDetectionDate())
                .detectionMethod(r.getDetectionMethod())
                .detectionSource(r.getDetectionSource())
                .sourceTransactionRef(r.getSourceTransactionRef())
                .sourceContractRef(r.getSourceContractRef())
                .sourceContractType(r.getSourceContractType())
                .sourceAccountCode(r.getSourceAccountCode())
                .incomeType(r.getIncomeType())
                .amount(r.getAmount())
                .currencyCode(r.getCurrencyCode())
                .incomeDate(r.getIncomeDate())
                .nonComplianceType(r.getNonComplianceType())
                .nonComplianceDescription(r.getNonComplianceDescription())
                .nonComplianceDescriptionAr(r.getNonComplianceDescriptionAr())
                .shariahRuleViolated(r.getShariahRuleViolated())
                .ssbRulingRef(r.getSsbRulingRef())
                .quarantineStatus(r.getQuarantineStatus())
                .quarantinedAt(r.getQuarantinedAt())
                .quarantineJournalRef(r.getQuarantineJournalRef())
                .quarantineGlAccount(r.getQuarantineGlAccount())
                .purificationBatchId(r.getPurificationBatchId())
                .purifiedAt(r.getPurifiedAt())
                .purificationJournalRef(r.getPurificationJournalRef())
                .charityRecipient(r.getCharityRecipient())
                .approvedForPurificationBy(r.getApprovedForPurificationBy())
                .approvedForPurificationAt(r.getApprovedForPurificationAt())
                .disputedBy(r.getDisputedBy())
                .disputeReason(r.getDisputeReason())
                .disputeResolvedBy(r.getDisputeResolvedBy())
                .disputeResolvedAt(r.getDisputeResolvedAt())
                .alertId(r.getAlertId())
                .auditFindingId(r.getAuditFindingId())
                .tenantId(r.getTenantId())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .createdBy(r.getCreatedBy())
                .updatedBy(r.getUpdatedBy())
                .version(r.getVersion())
                .build();
    }
}
