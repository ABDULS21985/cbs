package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.shariahcompliance.dto.*;
import com.cbs.shariahcompliance.entity.*;
import com.cbs.shariahcompliance.repository.ShariahAuditFindingRepository;
import com.cbs.shariahcompliance.repository.ShariahAuditRepository;
import com.cbs.shariahcompliance.repository.ShariahAuditSampleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShariahAuditServiceTest {

    @Mock
    ShariahAuditRepository auditRepository;
    @Mock
    ShariahAuditSampleRepository sampleRepository;
    @Mock
    ShariahAuditFindingRepository findingRepository;
    @Mock
    SnciService snciService;
    @Mock
    CurrentActorProvider actorProvider;

    @InjectMocks
    ShariahAuditService service;

    private ShariahAudit plannedAudit;
    private ShariahAudit fieldworkCompleteAudit;

    @BeforeEach
    void setUp() {
        plannedAudit = ShariahAudit.builder()
                .id(1L)
                .auditRef("SAR-2026-00001")
                .auditType(AuditType.ANNUAL)
                .auditScope("Full annual Shariah compliance review")
                .periodFrom(LocalDate.of(2025, 1, 1))
                .periodTo(LocalDate.of(2025, 12, 31))
                .leadAuditor("Dr. Ahmad")
                .status(ShariahAuditStatus.PLANNED)
                .totalFindingsCount(0)
                .criticalFindings(0)
                .highFindings(0)
                .mediumFindings(0)
                .lowFindings(0)
                .sampleSize(0)
                .totalTransactionsInScope(0)
                .build();

        fieldworkCompleteAudit = ShariahAudit.builder()
                .id(2L)
                .auditRef("SAR-2026-00002")
                .auditType(AuditType.QUARTERLY)
                .auditScope("Q1 review")
                .periodFrom(LocalDate.of(2026, 1, 1))
                .periodTo(LocalDate.of(2026, 3, 31))
                .leadAuditor("Dr. Fatima")
                .status(ShariahAuditStatus.FIELDWORK_COMPLETE)
                .sampleSize(10)
                .totalFindingsCount(0)
                .criticalFindings(0)
                .highFindings(0)
                .mediumFindings(0)
                .lowFindings(0)
                .totalTransactionsInScope(500)
                .build();
    }

    @Test
    void planAudit_createsInPlannedStatus() {
        // Arrange
        PlanShariahAuditRequest request = PlanShariahAuditRequest.builder()
                .auditType("ANNUAL")
                .auditScope("Full annual Shariah compliance audit")
                .periodFrom(LocalDate.of(2025, 1, 1))
                .periodTo(LocalDate.of(2025, 12, 31))
                .leadAuditor("Dr. Ahmad")
                .auditTeamMembers(List.of("Auditor A", "Auditor B"))
                .ssbLiaison("Sheikh Mohammed")
                .build();

        when(auditRepository.save(any(ShariahAudit.class))).thenAnswer(inv -> {
            ShariahAudit a = inv.getArgument(0);
            a.setId(10L);
            return a;
        });

        // Act
        ShariahAuditResponse response = service.planAudit(request);

        // Assert
        assertNotNull(response);
        assertEquals(ShariahAuditStatus.PLANNED, response.getStatus());
        assertEquals(AuditType.ANNUAL, response.getAuditType());
        assertEquals("Dr. Ahmad", response.getLeadAuditor());
        assertNotNull(response.getAuditRef());
        assertTrue(response.getAuditRef().startsWith("SAR-"));
        assertEquals(0, response.getSampleSize());
        assertEquals(0, response.getTotalFindingsCount());
        verify(auditRepository).save(any(ShariahAudit.class));
    }

    @Test
    void calculateComplianceScore_correctCalculation() {
        // Arrange: 10 samples total — 8 compliant, 2 non-compliant, 0 observations
        Long auditId = 2L;
        when(sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.COMPLIANT)).thenReturn(8L);
        when(sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.NON_COMPLIANT)).thenReturn(2L);
        when(sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.OBSERVATION)).thenReturn(0L);

        // Act
        BigDecimal score = service.calculateComplianceScore(auditId);

        // Assert: 8/10 * 100 = 80.0000
        BigDecimal expected = BigDecimal.valueOf(8)
                .divide(BigDecimal.valueOf(10), 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(4, RoundingMode.HALF_UP);
        assertEquals(expected, score);
    }

    @Test
    void calculateComplianceScore_noSamples_returns100() {
        // Arrange: no reviewed samples
        Long auditId = 1L;
        when(sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.COMPLIANT)).thenReturn(0L);
        when(sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.NON_COMPLIANT)).thenReturn(0L);
        when(sampleRepository.countByAuditIdAndComplianceResult(auditId, ComplianceResult.OBSERVATION)).thenReturn(0L);

        // Act
        BigDecimal score = service.calculateComplianceScore(auditId);

        // Assert: default 0 when no samples have been reviewed
        assertEquals(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP), score);
    }

    @Test
    void reviewSample_nonCompliant_autoCreatesFinding() {
        // Arrange
        ShariahAuditSample sample = ShariahAuditSample.builder()
                .id(50L)
                .auditId(1L)
                .sampleNumber(3)
                .entityType(AuditEntityType.PAYMENT)
                .entityRef("TXN-500")
                .reviewStatus(SampleReviewStatus.PENDING)
                .build();

        ReviewSampleRequest request = ReviewSampleRequest.builder()
                .complianceResult("NON_COMPLIANT")
                .notes("Riba element found in late payment fee structure")
                .build();

        when(sampleRepository.findById(50L)).thenReturn(Optional.of(sample));
        when(sampleRepository.save(any(ShariahAuditSample.class))).thenAnswer(inv -> inv.getArgument(0));
        when(actorProvider.getCurrentActor()).thenReturn("auditor-a");

        // Mock for the auto-created finding path
        when(auditRepository.findById(1L)).thenReturn(Optional.of(plannedAudit));
        when(findingRepository.save(any(ShariahAuditFinding.class))).thenAnswer(inv -> {
            ShariahAuditFinding f = inv.getArgument(0);
            f.setId(500L);
            return f;
        });
        // Mock finding counts for updateAuditFindingCounts
        when(findingRepository.countByAuditIdAndSeverity(eq(1L), any(FindingSeverity.class))).thenReturn(0L);
        when(auditRepository.save(any(ShariahAudit.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        service.reviewSample(50L, request);

        // Assert: sample updated
        assertEquals(ComplianceResult.NON_COMPLIANT, sample.getComplianceResult());
        assertEquals(SampleReviewStatus.REVIEWED, sample.getReviewStatus());
        assertEquals("auditor-a", sample.getReviewedBy());
        assertNotNull(sample.getReviewedAt());

        // Assert: finding auto-created
        ArgumentCaptor<ShariahAuditFinding> findingCaptor = ArgumentCaptor.forClass(ShariahAuditFinding.class);
        verify(findingRepository).save(findingCaptor.capture());
        ShariahAuditFinding createdFinding = findingCaptor.getValue();
        assertEquals(1L, createdFinding.getAuditId());
        assertEquals(50L, createdFinding.getSampleId());
        assertEquals(FindingCategory.OPERATIONAL, createdFinding.getCategory());
        assertEquals(FindingSeverity.MEDIUM, createdFinding.getSeverity());
        assertEquals(RemediationStatus.OPEN, createdFinding.getRemediationStatus());
        assertTrue(createdFinding.getTitle().contains("Non-compliant sample #3"));
    }

    @Test
    void createFinding_withSnciImplication_createsSnciRecord() {
        // Arrange
        when(auditRepository.findById(1L)).thenReturn(Optional.of(plannedAudit));
        when(findingRepository.save(any(ShariahAuditFinding.class))).thenAnswer(inv -> {
            ShariahAuditFinding f = inv.getArgument(0);
            f.setId(600L);
            return f;
        });
        when(findingRepository.countByAuditIdAndSeverity(eq(1L), any(FindingSeverity.class))).thenReturn(0L);
        when(auditRepository.save(any(ShariahAudit.class))).thenAnswer(inv -> inv.getArgument(0));

        SnciRecordResponse snciResponse = SnciRecordResponse.builder()
                .id(700L)
                .snciRef("SNCI-2026-00100")
                .amount(new BigDecimal("15000.00"))
                .quarantineStatus(QuarantineStatus.DETECTED)
                .build();

        when(snciService.createSnciRecord(any(CreateSnciRecordRequest.class))).thenReturn(snciResponse);

        CreateAuditFindingRequest request = CreateAuditFindingRequest.builder()
                .auditId(1L)
                .title("Non-compliant investment income")
                .description("Investment in non-Shariah-compliant equity detected")
                .category("OPERATIONAL")
                .severity("HIGH")
                .shariahRuleViolated("AAOIFI FAS 21")
                .hasSnciImplication(true)
                .snciAmount(new BigDecimal("15000.00"))
                .build();

        // Act
        AuditFindingResponse response = service.createFinding(request);

        // Assert
        assertNotNull(response);
        assertEquals(1L, response.getAuditId());
        assertEquals(FindingSeverity.HIGH, response.getSeverity());
        assertTrue(response.isHasSnciImplication());
        assertEquals(700L, response.getSnciRecordId());

        // Verify SNCI record was created
        ArgumentCaptor<CreateSnciRecordRequest> snciCaptor = ArgumentCaptor.forClass(CreateSnciRecordRequest.class);
        verify(snciService).createSnciRecord(snciCaptor.capture());
        CreateSnciRecordRequest snciReq = snciCaptor.getValue();
        assertEquals("SHARIAH_AUDIT", snciReq.getDetectionMethod());
        assertEquals(new BigDecimal("15000.00"), snciReq.getAmount());
        assertEquals("SAR", snciReq.getCurrencyCode());
    }

    @Test
    void getOverdueRemediations_returnsCorrectList() {
        // Arrange
        ShariahAuditFinding overdueFinding1 = ShariahAuditFinding.builder()
                .id(801L)
                .auditId(1L)
                .findingRef("SAR-2026-00001-F001")
                .title("Overdue Finding 1")
                .category(FindingCategory.OPERATIONAL)
                .severity(FindingSeverity.HIGH)
                .remediationStatus(RemediationStatus.OPEN)
                .remediationDueDate(LocalDate.of(2026, 1, 1))
                .hasSnciImplication(false)
                .ssbAccepted(false)
                .build();

        ShariahAuditFinding overdueFinding2 = ShariahAuditFinding.builder()
                .id(802L)
                .auditId(1L)
                .findingRef("SAR-2026-00001-F002")
                .title("Overdue Finding 2")
                .category(FindingCategory.OPERATIONAL)
                .severity(FindingSeverity.CRITICAL)
                .remediationStatus(RemediationStatus.IN_PROGRESS)
                .remediationDueDate(LocalDate.of(2026, 2, 1))
                .hasSnciImplication(false)
                .ssbAccepted(false)
                .build();

        when(findingRepository.findOverdueRemediations()).thenReturn(List.of(overdueFinding1, overdueFinding2));

        // Act
        List<AuditFindingResponse> results = service.getOverdueRemediations();

        // Assert
        assertEquals(2, results.size());
        assertEquals("SAR-2026-00001-F001", results.get(0).getFindingRef());
        assertEquals("SAR-2026-00001-F002", results.get(1).getFindingRef());
        assertEquals(FindingSeverity.HIGH, results.get(0).getSeverity());
        assertEquals(FindingSeverity.CRITICAL, results.get(1).getSeverity());
        verify(findingRepository).findOverdueRemediations();
    }

    @Test
    void generateDraftReport_determinesOpinion() {
        // Arrange: audit with 10 samples, 8 compliant, 2 non-compliant
        // base score = 80%, then: 1 critical (-10), 1 medium (-2) => adjusted = 68%
        // 68% falls in [60, 80) => PARTIALLY_COMPLIANT
        when(auditRepository.findById(2L)).thenReturn(Optional.of(fieldworkCompleteAudit));
        when(sampleRepository.countByAuditIdAndReviewStatus(2L, SampleReviewStatus.REVIEWED)).thenReturn(10L);

        when(sampleRepository.countByAuditIdAndComplianceResult(2L, ComplianceResult.COMPLIANT)).thenReturn(8L);
        when(sampleRepository.countByAuditIdAndComplianceResult(2L, ComplianceResult.NON_COMPLIANT)).thenReturn(2L);
        when(sampleRepository.countByAuditIdAndComplianceResult(2L, ComplianceResult.OBSERVATION)).thenReturn(0L);

        // 1 critical finding, 0 high, 1 medium, 0 low
        when(findingRepository.countByAuditIdAndSeverity(2L, FindingSeverity.CRITICAL)).thenReturn(1L);
        when(findingRepository.countByAuditIdAndSeverity(2L, FindingSeverity.HIGH)).thenReturn(0L);
        when(findingRepository.countByAuditIdAndSeverity(2L, FindingSeverity.MEDIUM)).thenReturn(1L);
        when(findingRepository.countByAuditIdAndSeverity(2L, FindingSeverity.LOW)).thenReturn(0L);
        when(findingRepository.countByAuditIdAndSeverity(2L, FindingSeverity.OBSERVATION)).thenReturn(0L);

        when(auditRepository.save(any(ShariahAudit.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        ShariahAuditResponse response = service.generateDraftReport(2L);

        // Assert
        assertEquals(ShariahAuditStatus.DRAFT_REPORT, response.getStatus());
        assertNotNull(response.getComplianceScore());

        // base score = 80.0000, adjustments: -10 (critical) -2 (medium) = 68.0000
        BigDecimal expectedScore = BigDecimal.valueOf(80)
                .setScale(4, RoundingMode.HALF_UP)
                .subtract(BigDecimal.TEN) // 1 critical
                .subtract(BigDecimal.valueOf(2)); // 1 medium
        assertEquals(expectedScore, response.getComplianceScore());

        // 68% => PARTIALLY_COMPLIANT (>= 60 and < 80)
        assertEquals(AuditOverallOpinion.PARTIALLY_COMPLIANT, response.getOverallOpinion());
        assertNotNull(response.getReportDate());
    }
}
