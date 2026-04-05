package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.shariahcompliance.dto.CreateSnciRecordRequest;
import com.cbs.shariahcompliance.dto.SnciRecordResponse;
import com.cbs.shariahcompliance.dto.SnciSearchCriteria;
import com.cbs.shariahcompliance.dto.SnciSummary;
import com.cbs.shariahcompliance.entity.DetectionMethod;
import com.cbs.shariahcompliance.entity.NonComplianceType;
import com.cbs.shariahcompliance.entity.QuarantineStatus;
import com.cbs.shariahcompliance.entity.ShariahComplianceAlert;
import com.cbs.shariahcompliance.entity.SnciRecord;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.entity.ShariahExclusionListEntry;
import com.cbs.shariahcompliance.repository.ShariahComplianceAlertRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import com.cbs.shariahcompliance.repository.SnciRecordRepository;
import com.cbs.profitdistribution.entity.PoolIncomeRecord;
import com.cbs.profitdistribution.repository.PoolIncomeRecordRepository;
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
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SnciService {

    private final SnciRecordRepository snciRepository;
    private final ShariahComplianceAlertRepository alertRepository;
    private final PoolIncomeRecordRepository poolIncomeRecordRepository;
    private final ShariahExclusionListEntryRepository exclusionListEntryRepository;
    private final ShariahExclusionListRepository exclusionListRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final CurrentActorProvider actorProvider;

    private static final AtomicLong SNCI_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);
    private static final String SNCI_QUARANTINE_GL = "2350-000-001";

    // ── Detection ──────────────────────────────────────────────────────────────

    public SnciRecordResponse createSnciRecord(CreateSnciRecordRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("SNCI amount must be positive", "INVALID_AMOUNT");
        }

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
        List<SnciRecordResponse> detectedRecords = new ArrayList<>();

        // 1. Query income records from pools for the period using date-range query
        List<PoolIncomeRecord> allIncome = new ArrayList<>();
        try {
            allIncome = poolIncomeRecordRepository.findNonCharityByIncomeDateBetween(fromDate, toDate);
        } catch (Exception e) {
            log.warn("Could not load pool income records: {}", e.getMessage());
        }

        // 2. For each income record, check against Shariah exclusion lists
        ShariahExclusionList haramMccList = exclusionListRepository.findByListCode("HARAM_MCC").orElse(null);
        List<ShariahExclusionListEntry> exclusionEntries = new ArrayList<>();
        if (haramMccList != null) {
            exclusionEntries = exclusionListEntryRepository.findByListIdAndStatus(haramMccList.getId(), "ACTIVE");
        }
        Set<String> excludedValues = exclusionEntries.stream()
                .map(ShariahExclusionListEntry::getEntryValue)
                .collect(Collectors.toSet());

        for (PoolIncomeRecord income : allIncome) {
            boolean flagged = false;
            String reason = null;
            NonComplianceType nonComplianceType = null;

            // Check if contract type or asset reference matches exclusion criteria
            if (income.getContractTypeCode() != null && excludedValues.contains(income.getContractTypeCode())) {
                flagged = true;
                reason = "Income from contract type on Shariah exclusion list: " + income.getContractTypeCode();
                nonComplianceType = NonComplianceType.PRODUCT_NON_COMPLIANT;
            }

            // Check for LATE_PAYMENT type that wasn't flagged as charity
            if (income.getIncomeType() != null && income.getIncomeType().name().contains("LATE_PAYMENT")) {
                flagged = true;
                reason = "Late payment income not directed to charity fund";
                nonComplianceType = NonComplianceType.RIBA_ELEMENT;
            }

            if (flagged && income.getAmount() != null && income.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                // Deduplication: skip if SNCI record already exists for this income record
                if (income.getJournalRef() != null && income.getAssetReferenceCode() != null
                        && snciRepository.existsBySourceTransactionRefAndSourceContractRef(
                                income.getJournalRef(), income.getAssetReferenceCode())) {
                    log.debug("Skipping duplicate SNCI for income journalRef={}, assetRef={}",
                            income.getJournalRef(), income.getAssetReferenceCode());
                    continue;
                }
                try {
                    CreateSnciRecordRequest snciRequest = CreateSnciRecordRequest.builder()
                            .detectionMethod(DetectionMethod.AUTOMATED_MONITORING.name())
                            .detectionSource("AUTOMATED_DETECTION_RUN_" + fromDate + "_" + toDate)
                            .sourceTransactionRef(income.getJournalRef())
                            .sourceContractRef(income.getAssetReferenceCode())
                            .sourceContractType(income.getContractTypeCode())
                            .incomeType(income.getIncomeType() != null ? income.getIncomeType().name() : "OTHER")
                            .amount(income.getAmount())
                            .currencyCode(income.getCurrencyCode())
                            .incomeDate(income.getIncomeDate())
                            .nonComplianceType(nonComplianceType.name())
                            .nonComplianceDescription(reason)
                            .build();
                    SnciRecordResponse created = createSnciRecord(snciRequest);
                    detectedRecords.add(created);
                } catch (Exception e) {
                    log.warn("Failed to create SNCI for income record {}: {}", income.getId(), e.getMessage());
                }
            }
        }

        log.info("Automated SNCI detection complete: {} records detected from {} to {}",
                detectedRecords.size(), fromDate, toDate);
        return detectedRecords;
    }

    // ── Quarantine ─────────────────────────────────────────────────────────────

    public void quarantineIncome(Long snciId) {
        SnciRecord record = loadSnciRecord(snciId);

        if (record.getQuarantineStatus() != QuarantineStatus.DETECTED) {
            String detail = switch (record.getQuarantineStatus()) {
                case QUARANTINED -> "already quarantined";
                case PURIFIED -> "already purified — cannot revert";
                case WAIVED_BY_SSB -> "waived by SSB — cannot quarantine";
                case DISPUTED -> "currently under dispute — resolve dispute first";
                case PENDING_PURIFICATION -> "already pending purification";
                case PURIFICATION_APPROVED -> "already approved for purification";
                default -> "current status: " + record.getQuarantineStatus();
            };
            throw new BusinessException(
                    "Cannot quarantine SNCI record " + record.getSnciRef() + " — " + detail,
                    "SNCI_INVALID_STATUS_FOR_QUARANTINE");
        }

        record.setQuarantineStatus(QuarantineStatus.QUARANTINED);
        record.setQuarantinedAt(LocalDateTime.now());
        record.setQuarantineGlAccount(SNCI_QUARANTINE_GL);

        // GL posting: DR source account, CR SNCI quarantine holding account
        try {
            var journalEntry = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .txnType(IslamicTransactionType.CHARITY_DISTRIBUTION)
                    .contractTypeCode("SNCI_QUARANTINE")
                    .amount(record.getAmount())
                    .reference(record.getSnciRef())
                    .narration("SNCI quarantine — " + record.getNonComplianceType()
                            + " from " + (record.getSourceContractRef() != null ? record.getSourceContractRef() : "unknown"))
                    .build());
            if (journalEntry != null) {
                record.setQuarantineJournalRef(journalEntry.getJournalNumber());
            }
        } catch (Exception e) {
            log.error("GL posting failed for SNCI quarantine {}: {}", record.getSnciRef(), e.getMessage(), e);
            throw new BusinessException(
                    "GL posting failed for SNCI quarantine: " + e.getMessage(),
                    "SNCI_GL_POSTING_FAILED");
        }

        snciRepository.save(record);

        log.info("Quarantined SNCI record {} — amount {} {} moved to quarantine GL {}",
                record.getSnciRef(), record.getAmount(), record.getCurrencyCode(), SNCI_QUARANTINE_GL);
        log.info("AUDIT: SNCI quarantined - ref={}, amount={}, type={}, actor={}",
                record.getSnciRef(), record.getAmount(), record.getNonComplianceType(),
                actorProvider.getCurrentActor());
    }

    public Map<String, Object> batchQuarantine(List<Long> snciIds) {
        List<Long> succeeded = new ArrayList<>();
        Map<Long, String> failed = new HashMap<>();

        for (Long snciId : snciIds) {
            try {
                quarantineIncome(snciId);
                succeeded.add(snciId);
            } catch (Exception e) {
                log.warn("Failed to quarantine SNCI record id={}: {}", snciId, e.getMessage());
                failed.put(snciId, e.getMessage());
            }
        }

        if (!failed.isEmpty() && failed.size() == snciIds.size()) {
            throw new BusinessException(
                    "Batch quarantine failed for all records",
                    "SNCI_BATCH_QUARANTINE_FAILED");
        }

        log.info("Batch quarantine completed: {} of {} records quarantined successfully",
                succeeded.size(), snciIds.size());

        Map<String, Object> result = new HashMap<>();
        result.put("totalRequested", snciIds.size());
        result.put("successCount", succeeded.size());
        result.put("failureCount", failed.size());
        result.put("succeededIds", succeeded);
        result.put("failures", failed);
        return result;
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

        if (record.getDisputedBy() == null || record.getDisputeReason() == null) {
            throw new BusinessException(
                    "Dispute metadata is incomplete for SNCI record " + record.getSnciRef()
                            + " — disputedBy and disputeReason must be set before resolution",
                    "SNCI_DISPUTE_METADATA_INCOMPLETE");
        }

        record.setDisputeResolvedBy(resolvedBy);
        record.setDisputeResolvedAt(LocalDateTime.now());
        record.setDisputeResolution(resolution);

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
        BigDecimal detectedAmount = safeSum(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DETECTED));
        BigDecimal quarantinedAmount = safeSum(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.QUARANTINED));
        BigDecimal pendingAmount = safeSum(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION));
        BigDecimal purifiedAmount = safeSum(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PURIFIED));
        BigDecimal disputedAmount = safeSum(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DISPUTED));

        BigDecimal totalAmount = detectedAmount.add(quarantinedAmount).add(pendingAmount)
                .add(purifiedAmount).add(disputedAmount);

        // Use count queries instead of loading all records into memory
        long detectedCount = snciRepository.countByQuarantineStatus(QuarantineStatus.DETECTED);
        long quarantinedCount = snciRepository.countByQuarantineStatus(QuarantineStatus.QUARANTINED);
        long pendingPurificationCount = snciRepository.countByQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION);
        long purifiedCount = snciRepository.countByQuarantineStatus(QuarantineStatus.PURIFIED);
        long disputedCount = snciRepository.countByQuarantineStatus(QuarantineStatus.DISPUTED);

        // Breakdown by non-compliance type using aggregate queries
        Map<String, BigDecimal> byType = new HashMap<>();
        for (NonComplianceType type : NonComplianceType.values()) {
            BigDecimal amount = safeSum(snciRepository.sumAmountByNonComplianceType(type));
            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                byType.put(type.name(), amount);
            }
        }

        // Breakdown by quarantine status using aggregate queries
        Map<String, BigDecimal> byStatus = new HashMap<>();
        for (QuarantineStatus status : QuarantineStatus.values()) {
            BigDecimal amount = safeSum(snciRepository.sumAmountByQuarantineStatus(status));
            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                byStatus.put(status.name(), amount);
            }
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

    private BigDecimal safeSum(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

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

            if (criteria.getSourceContractRef() != null && !criteria.getSourceContractRef().isBlank()) {
                predicates.add(cb.equal(root.get("sourceContractRef"), criteria.getSourceContractRef()));
            }

            if (criteria.getSourceTransactionRef() != null && !criteria.getSourceTransactionRef().isBlank()) {
                predicates.add(cb.equal(root.get("sourceTransactionRef"), criteria.getSourceTransactionRef()));
            }

            if (criteria.getIncomeType() != null && !criteria.getIncomeType().isBlank()) {
                predicates.add(cb.equal(root.get("incomeType"), criteria.getIncomeType()));
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
