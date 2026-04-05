package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.shariahcompliance.dto.AuditFindingResponse;
import com.cbs.shariahcompliance.dto.CreateAuditFindingRequest;
import com.cbs.shariahcompliance.dto.CreateSnciRecordRequest;
import com.cbs.shariahcompliance.dto.ManagementResponseRequest;
import com.cbs.shariahcompliance.dto.PlanShariahAuditRequest;
import com.cbs.shariahcompliance.dto.ReviewSampleRequest;
import com.cbs.shariahcompliance.dto.SamplingRequest;
import com.cbs.shariahcompliance.dto.ShariahAuditResponse;
import com.cbs.shariahcompliance.dto.SnciRecordResponse;
import com.cbs.shariahcompliance.entity.AuditEntityType;
import com.cbs.shariahcompliance.entity.AuditOverallOpinion;
import com.cbs.shariahcompliance.entity.AuditType;
import com.cbs.shariahcompliance.entity.ComplianceResult;
import com.cbs.shariahcompliance.entity.FindingCategory;
import com.cbs.shariahcompliance.entity.FindingSeverity;
import com.cbs.shariahcompliance.entity.RemediationStatus;
import com.cbs.shariahcompliance.entity.SampleReviewStatus;
import com.cbs.shariahcompliance.entity.SamplingMethodology;
import com.cbs.shariahcompliance.entity.ShariahAudit;
import com.cbs.shariahcompliance.entity.ShariahAuditFinding;
import com.cbs.shariahcompliance.entity.ShariahAuditSample;
import com.cbs.shariahcompliance.entity.ShariahAuditStatus;
import com.cbs.shariahcompliance.repository.ShariahAuditFindingRepository;
import com.cbs.shariahcompliance.repository.ShariahAuditRepository;
import com.cbs.shariahcompliance.repository.ShariahAuditSampleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ShariahAuditService {

    private final ShariahAuditRepository auditRepository;
    private final ShariahAuditSampleRepository sampleRepository;
    private final ShariahAuditFindingRepository findingRepository;
    private final SnciService snciService;
    private final CurrentActorProvider actorProvider;

    private static final AtomicLong AUDIT_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);
    private static final AtomicLong FINDING_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    // ── Audit Lifecycle ───────────────────────────────────────────────────────

    public ShariahAuditResponse planAudit(PlanShariahAuditRequest request) {
        String auditRef = "SAR-" + Year.now().getValue() + "-" + String.format("%05d", AUDIT_SEQ.incrementAndGet());

        ShariahAudit audit = ShariahAudit.builder()
                .auditRef(auditRef)
                .auditType(AuditType.valueOf(request.getAuditType()))
                .auditScope(request.getAuditScope())
                .periodFrom(request.getPeriodFrom())
                .periodTo(request.getPeriodTo())
                .auditPlanDate(LocalDate.now())
                .leadAuditor(request.getLeadAuditor())
                .auditTeamMembers(request.getAuditTeamMembers())
                .ssbLiaison(request.getSsbLiaison())
                .status(ShariahAuditStatus.PLANNED)
                .totalFindingsCount(0)
                .criticalFindings(0)
                .highFindings(0)
                .mediumFindings(0)
                .lowFindings(0)
                .sampleSize(0)
                .totalTransactionsInScope(0)
                .build();

        ShariahAudit saved = auditRepository.save(audit);
        log.info("Planned Shariah audit {} — type: {}, period: {} to {}, lead auditor: {}",
                auditRef, saved.getAuditType(), saved.getPeriodFrom(), saved.getPeriodTo(), saved.getLeadAuditor());

        return toAuditResponse(saved);
    }

    public ShariahAuditResponse startAudit(Long auditId) {
        ShariahAudit audit = loadAudit(auditId);

        if (audit.getStatus() != ShariahAuditStatus.PLANNED) {
            throw new BusinessException(
                    "Audit " + audit.getAuditRef() + " cannot be started — current status: " + audit.getStatus(),
                    "AUDIT_INVALID_STATUS_FOR_START");
        }

        // Validate that team members are assigned before starting
        if (audit.getAuditTeamMembers() == null || audit.getAuditTeamMembers().isEmpty()) {
            throw new BusinessException(
                    "Audit " + audit.getAuditRef() + " cannot be started — no audit team members assigned",
                    "AUDIT_NO_TEAM_MEMBERS");
        }

        audit.setStatus(ShariahAuditStatus.IN_PROGRESS);
        audit.setAuditStartDate(LocalDate.now());
        ShariahAudit saved = auditRepository.save(audit);

        log.info("Started Shariah audit {} — audit start date: {}", saved.getAuditRef(), saved.getAuditStartDate());
        return toAuditResponse(saved);
    }

    public ShariahAuditResponse completeFieldwork(Long auditId) {
        ShariahAudit audit = loadAudit(auditId);

        if (audit.getStatus() != ShariahAuditStatus.IN_PROGRESS) {
            throw new BusinessException(
                    "Audit " + audit.getAuditRef() + " fieldwork cannot be completed — current status: " + audit.getStatus(),
                    "AUDIT_INVALID_STATUS_FOR_FIELDWORK_COMPLETE");
        }

        // Validate that samples have been collected
        long sampleCount = sampleRepository.countByAuditIdAndReviewStatus(auditId, SampleReviewStatus.PENDING)
                + sampleRepository.countByAuditIdAndReviewStatus(auditId, SampleReviewStatus.REVIEWED);
        if (sampleCount == 0) {
            throw new BusinessException(
                    "Audit " + audit.getAuditRef() + " fieldwork cannot be completed — no samples have been collected",
                    "AUDIT_NO_SAMPLES_COLLECTED");
        }

        audit.setStatus(ShariahAuditStatus.FIELDWORK_COMPLETE);
        audit.setAuditEndDate(LocalDate.now());
        ShariahAudit saved = auditRepository.save(audit);

        log.info("Completed fieldwork for Shariah audit {} — audit end date: {}", saved.getAuditRef(), saved.getAuditEndDate());
        return toAuditResponse(saved);
    }

    // ── Sampling ──────────────────────────────────────────────────────────────

    public List<ShariahAuditSample> generateSample(Long auditId, SamplingRequest request) {
        if (request.getSampleSize() <= 0) {
            throw new BusinessException("Sample size must be positive", "AUDIT_INVALID_SAMPLE_SIZE");
        }

        ShariahAudit audit = loadAudit(auditId);

        SamplingMethodology methodology = SamplingMethodology.valueOf(request.getMethodology());
        List<AuditEntityType> entityTypes = new ArrayList<>();
        if (request.getEntityTypes() != null && !request.getEntityTypes().isEmpty()) {
            for (String et : request.getEntityTypes()) {
                entityTypes.add(AuditEntityType.valueOf(et));
            }
        } else {
            entityTypes.add(AuditEntityType.OTHER);
        }

        List<ShariahAuditSample> samples = new ArrayList<>();
        for (int i = 0; i < request.getSampleSize(); i++) {
            AuditEntityType entityType = entityTypes.get(i % entityTypes.size());

            ShariahAuditSample sample = ShariahAuditSample.builder()
                    .auditId(auditId)
                    .sampleNumber(i + 1)
                    .entityType(entityType)
                    .reviewStatus(SampleReviewStatus.PENDING)
                    .build();

            samples.add(sampleRepository.save(sample));
        }

        audit.setSampleSize(request.getSampleSize());
        audit.setSamplingMethodology(methodology);
        auditRepository.save(audit);

        log.info("Generated {} samples for audit {} — methodology: {}, entity types: {}",
                request.getSampleSize(), audit.getAuditRef(), methodology, entityTypes);

        return samples;
    }

    // ── Review ────────────────────────────────────────────────────────────────

    public void reviewSample(Long sampleId, ReviewSampleRequest request) {
        ShariahAuditSample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new ResourceNotFoundException("ShariahAuditSample", "id", sampleId));

        ComplianceResult complianceResult = ComplianceResult.valueOf(request.getComplianceResult());
        String currentActor = actorProvider.getCurrentActor();

        sample.setComplianceResult(complianceResult);
        sample.setEvidenceCollected(request.getEvidenceCollected());
        sample.setChecklistResults(request.getChecklistResults());
        sample.setNotes(request.getNotes());
        sample.setReviewedBy(currentActor);
        sample.setReviewedAt(LocalDateTime.now());
        sample.setReviewStatus(SampleReviewStatus.REVIEWED);

        sampleRepository.save(sample);

        log.info("Reviewed sample {} for audit id={} — result: {}, reviewed by: {}",
                sample.getSampleNumber(), sample.getAuditId(), complianceResult, currentActor);

        if (complianceResult == ComplianceResult.NON_COMPLIANT) {
            // Check if a finding already exists for this sample to avoid duplicates
            if (findingRepository.findByAuditIdAndSampleId(sample.getAuditId(), sampleId).isPresent()) {
                log.info("Finding already exists for sample {} in audit id={} — skipping auto-creation",
                        sample.getSampleNumber(), sample.getAuditId());
                return;
            }

            ShariahAudit audit = loadAudit(sample.getAuditId());
            CreateAuditFindingRequest findingRequest = CreateAuditFindingRequest.builder()
                    .auditId(sample.getAuditId())
                    .sampleId(sampleId)
                    .title("Non-compliant sample #" + sample.getSampleNumber() + " — " + sample.getEntityType())
                    .description("Auto-generated finding from non-compliant sample review. "
                            + "Entity type: " + sample.getEntityType()
                            + ", entity ref: " + sample.getEntityRef()
                            + ". Reviewer notes: " + (request.getNotes() != null ? request.getNotes() : "N/A"))
                    .category(FindingCategory.OPERATIONAL.name())
                    .severity(FindingSeverity.MEDIUM.name())
                    .hasSnciImplication(false)
                    .build();

            createFinding(findingRequest);
            log.info("Auto-created draft finding for non-compliant sample {} in audit {}",
                    sample.getSampleNumber(), audit.getAuditRef());
        }
    }

    // ── Findings ──────────────────────────────────────────────────────────────

    public AuditFindingResponse createFinding(CreateAuditFindingRequest request) {
        ShariahAudit audit = loadAudit(request.getAuditId());

        String findingRef = audit.getAuditRef() + "-F" + String.format("%03d", FINDING_SEQ.incrementAndGet());

        ShariahAuditFinding finding = ShariahAuditFinding.builder()
                .auditId(request.getAuditId())
                .findingRef(findingRef)
                .sampleId(request.getSampleId())
                .title(request.getTitle())
                .description(request.getDescription())
                .category(FindingCategory.valueOf(request.getCategory()))
                .severity(FindingSeverity.valueOf(request.getSeverity()))
                .shariahRuleViolated(request.getShariahRuleViolated())
                .impact(request.getImpact())
                .recommendation(request.getRecommendation())
                .hasSnciImplication(request.isHasSnciImplication())
                .snciAmount(request.getSnciAmount())
                .remediationStatus(RemediationStatus.OPEN)
                .ssbAccepted(false)
                .build();

        ShariahAuditFinding saved = findingRepository.save(finding);

        if (request.isHasSnciImplication() && request.getSnciAmount() != null && request.getSnciAmount().compareTo(BigDecimal.ZERO) > 0) {
            try {
                CreateSnciRecordRequest snciRequest = CreateSnciRecordRequest.builder()
                        .detectionMethod("SHARIAH_AUDIT")
                        .detectionSource("Audit " + audit.getAuditRef() + " — finding " + findingRef)
                        .amount(request.getSnciAmount())
                        .currencyCode("SAR")
                        .nonComplianceType("OTHER")
                        .nonComplianceDescription("SNCI from audit finding: " + request.getTitle())
                        .shariahRuleViolated(request.getShariahRuleViolated())
                        .build();

                SnciRecordResponse snciRecord = snciService.createSnciRecord(snciRequest);
                saved.setSnciRecordId(snciRecord.getId());
                findingRepository.save(saved);

                log.info("Created linked SNCI record {} for finding {} — amount: {}",
                        snciRecord.getSnciRef(), findingRef, request.getSnciAmount());
            } catch (Exception e) {
                log.error("Failed to create SNCI record for finding {} — saving finding without SNCI link: {}",
                        findingRef, e.getMessage(), e);
            }
        }

        updateAuditFindingCounts(audit);

        log.info("Created audit finding {} — category: {}, severity: {}, has SNCI: {}",
                findingRef, saved.getCategory(), saved.getSeverity(), saved.isHasSnciImplication());

        return toFindingResponse(saved);
    }

    public void updateFinding(Long findingId, CreateAuditFindingRequest request) {
        ShariahAuditFinding finding = loadFinding(findingId);

        finding.setTitle(request.getTitle());
        finding.setDescription(request.getDescription());
        finding.setCategory(FindingCategory.valueOf(request.getCategory()));
        finding.setSeverity(FindingSeverity.valueOf(request.getSeverity()));
        finding.setShariahRuleViolated(request.getShariahRuleViolated());
        finding.setImpact(request.getImpact());
        finding.setRecommendation(request.getRecommendation());
        finding.setHasSnciImplication(request.isHasSnciImplication());
        finding.setSnciAmount(request.getSnciAmount());
        if (request.getSampleId() != null) {
            finding.setSampleId(request.getSampleId());
        }

        findingRepository.save(finding);

        ShariahAudit audit = loadAudit(finding.getAuditId());
        updateAuditFindingCounts(audit);

        log.info("Updated audit finding {} — category: {}, severity: {}", finding.getFindingRef(), finding.getCategory(), finding.getSeverity());
    }

    public void recordManagementResponse(Long findingId, ManagementResponseRequest response) {
        ShariahAuditFinding finding = loadFinding(findingId);

        finding.setManagementResponse(response.getResponse());
        finding.setManagementRespondedBy(response.getRespondedBy());
        finding.setManagementRespondedAt(LocalDateTime.now());

        findingRepository.save(finding);

        log.info("Recorded management response for finding {} by {}", finding.getFindingRef(), response.getRespondedBy());
    }

    public void verifyRemediation(Long findingId, String verifiedBy) {
        ShariahAuditFinding finding = loadFinding(findingId);

        if (finding.getRemediationStatus() != RemediationStatus.IN_PROGRESS
                && finding.getRemediationStatus() != RemediationStatus.REMEDIATED) {
            throw new BusinessException(
                    "Finding " + finding.getFindingRef() + " cannot be verified — current remediation status: " + finding.getRemediationStatus(),
                    "FINDING_INVALID_REMEDIATION_STATUS");
        }

        // Ensure management response has been recorded before verification
        if (finding.getManagementResponse() == null || finding.getManagementRespondedBy() == null) {
            throw new BusinessException(
                    "Finding " + finding.getFindingRef() + " cannot be verified — management response must be recorded first",
                    "FINDING_NO_MANAGEMENT_RESPONSE");
        }

        finding.setRemediationVerifiedBy(verifiedBy);
        finding.setRemediationVerifiedAt(LocalDateTime.now());
        finding.setRemediationStatus(RemediationStatus.CLOSED);
        finding.setRemediationCompletedDate(LocalDate.now());

        findingRepository.save(finding);

        log.info("Verified remediation for finding {} by {} — status set to CLOSED", finding.getFindingRef(), verifiedBy);
    }

    @Transactional(readOnly = true)
    public List<AuditFindingResponse> getOpenFindings() {
        List<ShariahAuditFinding> openFindings = findingRepository.findByRemediationStatus(RemediationStatus.OPEN);
        List<ShariahAuditFinding> inProgressFindings = findingRepository.findByRemediationStatus(RemediationStatus.IN_PROGRESS);

        List<AuditFindingResponse> results = new ArrayList<>();
        for (ShariahAuditFinding f : openFindings) {
            results.add(toFindingResponse(f));
        }
        for (ShariahAuditFinding f : inProgressFindings) {
            results.add(toFindingResponse(f));
        }
        return results;
    }

    @Transactional(readOnly = true)
    public List<AuditFindingResponse> getOverdueRemediations() {
        List<ShariahAuditFinding> overdue = findingRepository.findOverdueRemediations();
        return overdue.stream().map(this::toFindingResponse).toList();
    }

    // ── Reporting ─────────────────────────────────────────────────────────────

    public ShariahAuditResponse generateDraftReport(Long auditId) {
        ShariahAudit audit = loadAudit(auditId);

        long reviewedSamples = sampleRepository.countByAuditIdAndReviewStatus(auditId, SampleReviewStatus.REVIEWED);
        if (reviewedSamples == 0) {
            throw new BusinessException(
                    "Cannot generate draft report for audit " + audit.getAuditRef() + " — no samples have been reviewed",
                    "AUDIT_NO_SAMPLES_REVIEWED");
        }

        BigDecimal complianceScore = calculateComplianceScore(auditId);
        if (complianceScore == null) {
            complianceScore = BigDecimal.ZERO;
        }
        audit.setComplianceScore(complianceScore);

        long critical = findingRepository.countByAuditIdAndSeverity(auditId, FindingSeverity.CRITICAL);
        long high = findingRepository.countByAuditIdAndSeverity(auditId, FindingSeverity.HIGH);
        long medium = findingRepository.countByAuditIdAndSeverity(auditId, FindingSeverity.MEDIUM);
        long low = findingRepository.countByAuditIdAndSeverity(auditId, FindingSeverity.LOW);

        BigDecimal adjustedScore = complianceScore;
        adjustedScore = adjustedScore.subtract(BigDecimal.TEN.multiply(BigDecimal.valueOf(critical)));
        adjustedScore = adjustedScore.subtract(BigDecimal.valueOf(5).multiply(BigDecimal.valueOf(high)));
        adjustedScore = adjustedScore.subtract(BigDecimal.valueOf(2).multiply(BigDecimal.valueOf(medium)));
        adjustedScore = adjustedScore.subtract(BigDecimal.ONE.multiply(BigDecimal.valueOf(low)));

        if (adjustedScore.compareTo(BigDecimal.ZERO) < 0) {
            adjustedScore = BigDecimal.ZERO;
        }

        audit.setComplianceScore(adjustedScore);

        AuditOverallOpinion opinion;
        if (adjustedScore.compareTo(BigDecimal.valueOf(95)) >= 0) {
            opinion = AuditOverallOpinion.FULLY_COMPLIANT;
        } else if (adjustedScore.compareTo(BigDecimal.valueOf(80)) >= 0) {
            opinion = AuditOverallOpinion.SUBSTANTIALLY_COMPLIANT;
        } else if (adjustedScore.compareTo(BigDecimal.valueOf(60)) >= 0) {
            opinion = AuditOverallOpinion.PARTIALLY_COMPLIANT;
        } else {
            opinion = AuditOverallOpinion.NON_COMPLIANT;
        }

        audit.setOverallOpinion(opinion);
        audit.setStatus(ShariahAuditStatus.DRAFT_REPORT);
        audit.setReportDate(LocalDate.now());

        updateAuditFindingCounts(audit);

        ShariahAudit saved = auditRepository.save(audit);

        log.info("Generated draft report for audit {} — compliance score: {}, opinion: {}, findings: C={} H={} M={} L={}",
                saved.getAuditRef(), adjustedScore, opinion, critical, high, medium, low);

        return toAuditResponse(saved);
    }

    public void submitReportToSsb(Long auditId) {
        ShariahAudit audit = loadAudit(auditId);

        if (audit.getStatus() != ShariahAuditStatus.DRAFT_REPORT) {
            throw new BusinessException(
                    "Audit " + audit.getAuditRef() + " cannot be submitted to SSB — current status: " + audit.getStatus(),
                    "AUDIT_INVALID_STATUS_FOR_SSB_SUBMIT");
        }

        audit.setStatus(ShariahAuditStatus.SSB_REVIEW);
        auditRepository.save(audit);

        log.info("Submitted audit {} to SSB for review", audit.getAuditRef());
    }

    public void issueFinalReport(Long auditId, String opinion) {
        ShariahAudit audit = loadAudit(auditId);

        if (audit.getStatus() != ShariahAuditStatus.SSB_REVIEW) {
            throw new BusinessException(
                    "Audit " + audit.getAuditRef() + " cannot issue final report — current status: " + audit.getStatus(),
                    "AUDIT_INVALID_STATUS_FOR_FINAL_REPORT");
        }

        audit.setOverallOpinion(AuditOverallOpinion.valueOf(opinion));
        audit.setStatus(ShariahAuditStatus.FINAL_REPORT);
        auditRepository.save(audit);

        log.info("Issued final report for audit {} — opinion: {}", audit.getAuditRef(), opinion);
    }

    public ShariahAuditResponse closeAudit(Long auditId) {
        ShariahAudit audit = loadAudit(auditId);

        if (audit.getStatus() != ShariahAuditStatus.FINAL_REPORT) {
            throw new BusinessException(
                    "Audit " + audit.getAuditRef() + " cannot be closed — current status: " + audit.getStatus()
                            + ". Only audits in FINAL_REPORT status can be closed.",
                    "AUDIT_INVALID_STATUS_FOR_CLOSE");
        }

        audit.setStatus(ShariahAuditStatus.CLOSED);
        ShariahAudit saved = auditRepository.save(audit);

        log.info("Closed Shariah audit {}", saved.getAuditRef());
        return toAuditResponse(saved);
    }

    public BigDecimal calculateComplianceScore(Long auditId) {
        long compliantCount = sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.COMPLIANT);
        long nonCompliantCount = sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.NON_COMPLIANT);
        long observationCount = sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.OBSERVATION);

        long totalReviewed = compliantCount + nonCompliantCount + observationCount;

        if (totalReviewed == 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }

        BigDecimal score = BigDecimal.valueOf(compliantCount)
                .divide(BigDecimal.valueOf(totalReviewed), 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(4, RoundingMode.HALF_UP);

        return score;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ShariahAuditResponse getAudit(Long auditId) {
        ShariahAudit audit = loadAudit(auditId);
        return toAuditResponse(audit);
    }

    @Transactional(readOnly = true)
    public ShariahAuditResponse getAuditByRef(String auditRef) {
        ShariahAudit audit = auditRepository.findByAuditRef(auditRef)
                .orElseThrow(() -> new ResourceNotFoundException("ShariahAudit", "auditRef", auditRef));
        return toAuditResponse(audit);
    }

    @Transactional(readOnly = true)
    public List<ShariahAuditResponse> getAuditsByStatus(ShariahAuditStatus status) {
        List<ShariahAudit> audits = auditRepository.findByStatus(status);
        return audits.stream().map(this::toAuditResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ShariahAuditSample> getAuditSamples(Long auditId) {
        return sampleRepository.findByAuditId(auditId);
    }

    @Transactional(readOnly = true)
    public List<AuditFindingResponse> getAuditFindings(Long auditId) {
        List<ShariahAuditFinding> findings = findingRepository.findByAuditId(auditId);
        return findings.stream().map(this::toFindingResponse).toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ShariahAudit loadAudit(Long auditId) {
        return auditRepository.findById(auditId)
                .orElseThrow(() -> new ResourceNotFoundException("ShariahAudit", "id", auditId));
    }

    private ShariahAuditFinding loadFinding(Long findingId) {
        return findingRepository.findById(findingId)
                .orElseThrow(() -> new ResourceNotFoundException("ShariahAuditFinding", "id", findingId));
    }

    private void updateAuditFindingCounts(ShariahAudit audit) {
        long critical = findingRepository.countByAuditIdAndSeverity(audit.getId(), FindingSeverity.CRITICAL);
        long high = findingRepository.countByAuditIdAndSeverity(audit.getId(), FindingSeverity.HIGH);
        long medium = findingRepository.countByAuditIdAndSeverity(audit.getId(), FindingSeverity.MEDIUM);
        long low = findingRepository.countByAuditIdAndSeverity(audit.getId(), FindingSeverity.LOW);
        long observation = findingRepository.countByAuditIdAndSeverity(audit.getId(), FindingSeverity.OBSERVATION);

        audit.setCriticalFindings((int) critical);
        audit.setHighFindings((int) high);
        audit.setMediumFindings((int) medium);
        audit.setLowFindings((int) low);
        audit.setTotalFindingsCount((int) (critical + high + medium + low + observation));

        auditRepository.save(audit);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private ShariahAuditResponse toAuditResponse(ShariahAudit a) {
        return ShariahAuditResponse.builder()
                .id(a.getId())
                .auditRef(a.getAuditRef())
                .auditType(a.getAuditType())
                .auditScope(a.getAuditScope())
                .auditScopeAr(a.getAuditScopeAr())
                .periodFrom(a.getPeriodFrom())
                .periodTo(a.getPeriodTo())
                .auditPlanDate(a.getAuditPlanDate())
                .auditStartDate(a.getAuditStartDate())
                .auditEndDate(a.getAuditEndDate())
                .reportDate(a.getReportDate())
                .leadAuditor(a.getLeadAuditor())
                .auditTeamMembers(a.getAuditTeamMembers() != null ? a.getAuditTeamMembers() : List.of())
                .ssbLiaison(a.getSsbLiaison())
                .totalTransactionsInScope(a.getTotalTransactionsInScope())
                .sampleSize(a.getSampleSize())
                .samplingMethodology(a.getSamplingMethodology())
                .samplingConfidenceLevel(a.getSamplingConfidenceLevel())
                .samplingErrorMargin(a.getSamplingErrorMargin())
                .totalFindingsCount(a.getTotalFindingsCount())
                .criticalFindings(a.getCriticalFindings())
                .highFindings(a.getHighFindings())
                .mediumFindings(a.getMediumFindings())
                .lowFindings(a.getLowFindings())
                .complianceScore(a.getComplianceScore())
                .overallOpinion(a.getOverallOpinion())
                .opinionNarrative(a.getOpinionNarrative())
                .opinionNarrativeAr(a.getOpinionNarrativeAr())
                .status(a.getStatus())
                .notes(a.getNotes())
                .tenantId(a.getTenantId())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .createdBy(a.getCreatedBy())
                .updatedBy(a.getUpdatedBy())
                .version(a.getVersion())
                .build();
    }

    private AuditFindingResponse toFindingResponse(ShariahAuditFinding f) {
        return AuditFindingResponse.builder()
                .id(f.getId())
                .auditId(f.getAuditId())
                .findingRef(f.getFindingRef())
                .sampleId(f.getSampleId())
                .title(f.getTitle())
                .titleAr(f.getTitleAr())
                .description(f.getDescription())
                .descriptionAr(f.getDescriptionAr())
                .category(f.getCategory())
                .severity(f.getSeverity())
                .shariahRuleViolated(f.getShariahRuleViolated())
                .impact(f.getImpact())
                .impactAr(f.getImpactAr())
                .recommendation(f.getRecommendation())
                .recommendationAr(f.getRecommendationAr())
                .hasSnciImplication(f.isHasSnciImplication())
                .snciAmount(f.getSnciAmount())
                .snciRecordId(f.getSnciRecordId())
                .remediationStatus(f.getRemediationStatus())
                .remediationOwner(f.getRemediationOwner())
                .remediationDueDate(f.getRemediationDueDate())
                .remediationCompletedDate(f.getRemediationCompletedDate())
                .remediationNotes(f.getRemediationNotes())
                .remediationVerifiedBy(f.getRemediationVerifiedBy())
                .remediationVerifiedAt(f.getRemediationVerifiedAt())
                .managementResponse(f.getManagementResponse())
                .managementRespondedBy(f.getManagementRespondedBy())
                .managementRespondedAt(f.getManagementRespondedAt())
                .ssbAccepted(f.isSsbAccepted())
                .tenantId(f.getTenantId())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .createdBy(f.getCreatedBy())
                .updatedBy(f.getUpdatedBy())
                .version(f.getVersion())
                .build();
    }
}
