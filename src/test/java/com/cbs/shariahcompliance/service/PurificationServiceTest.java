package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.shariahcompliance.dto.CreatePurificationBatchRequest;
import com.cbs.shariahcompliance.dto.DisbursementPlan;
import com.cbs.shariahcompliance.dto.CharityFundReport;
import com.cbs.shariahcompliance.dto.PurificationBatchResponse;
import com.cbs.shariahcompliance.entity.*;
import com.cbs.shariahcompliance.repository.CharityRecipientRepository;
import com.cbs.shariahcompliance.repository.PurificationBatchRepository;
import com.cbs.shariahcompliance.repository.PurificationDisbursementRepository;
import com.cbs.shariahcompliance.repository.SnciRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurificationServiceTest {

    @Mock
    PurificationBatchRepository batchRepository;
    @Mock
    PurificationDisbursementRepository disbursementRepository;
    @Mock
    CharityRecipientRepository recipientRepository;
    @Mock
    SnciRecordRepository snciRepository;
    @Mock
    CurrentActorProvider actorProvider;

    @InjectMocks
    PurificationService service;

    private SnciRecord snci1;
    private SnciRecord snci2;
    private CharityRecipient approvedCharity;
    private CharityRecipient unapprovedCharity;

    @BeforeEach
    void setUp() {
        snci1 = SnciRecord.builder()
                .id(1L)
                .snciRef("SNCI-2026-00001")
                .amount(new BigDecimal("3000.00"))
                .currencyCode("SAR")
                .detectionDate(LocalDate.of(2026, 1, 15))
                .detectionMethod(DetectionMethod.SCREENING_ALERT)
                .nonComplianceType(NonComplianceType.HARAM_ACTIVITY)
                .quarantineStatus(QuarantineStatus.QUARANTINED)
                .build();

        snci2 = SnciRecord.builder()
                .id(2L)
                .snciRef("SNCI-2026-00002")
                .amount(new BigDecimal("2000.00"))
                .currencyCode("SAR")
                .detectionDate(LocalDate.of(2026, 2, 10))
                .detectionMethod(DetectionMethod.SHARIAH_AUDIT)
                .nonComplianceType(NonComplianceType.STRUCTURAL_VIOLATION)
                .quarantineStatus(QuarantineStatus.QUARANTINED)
                .build();

        approvedCharity = CharityRecipient.builder()
                .id(10L)
                .recipientCode("CHR-001")
                .name("Al-Khair Foundation")
                .ssbApproved(true)
                .status("ACTIVE")
                .maxAnnualDisbursement(new BigDecimal("100000.00"))
                .totalDisbursedYtd(BigDecimal.ZERO)
                .totalDisbursedLifetime(new BigDecimal("50000.00"))
                .build();

        unapprovedCharity = CharityRecipient.builder()
                .id(11L)
                .recipientCode("CHR-002")
                .name("Unapproved Charity")
                .ssbApproved(false)
                .status("ACTIVE")
                .totalDisbursedYtd(BigDecimal.ZERO)
                .totalDisbursedLifetime(BigDecimal.ZERO)
                .build();
    }

    @Test
    void createBatch_totalMatchesSnciSum() {
        // Arrange
        List<SnciRecord> eligibleRecords = List.of(snci1, snci2);
        when(snciRepository.findByQuarantineStatusIn(anyList())).thenReturn(eligibleRecords);
        when(batchRepository.save(any(PurificationBatch.class))).thenAnswer(inv -> {
            PurificationBatch b = inv.getArgument(0);
            b.setId(100L);
            return b;
        });
        when(snciRepository.saveAll(anyList())).thenReturn(eligibleRecords);

        CreatePurificationBatchRequest request = CreatePurificationBatchRequest.builder()
                .currencyCode("SAR")
                .build();

        // Act
        PurificationBatchResponse response = service.createBatch(request);

        // Assert: total should be 3000 + 2000 = 5000
        assertEquals(new BigDecimal("5000.00"), response.getTotalAmount());
        assertEquals("SAR", response.getCurrencyCode());
        assertEquals(2, response.getItemCount());
        assertEquals(PurificationBatchStatus.DRAFT, response.getStatus());
        verify(batchRepository).save(any(PurificationBatch.class));
        verify(snciRepository).saveAll(anyList());
    }

    @Test
    void planDisbursements_unapprovedCharity_rejected() {
        // Arrange
        PurificationBatch batch = PurificationBatch.builder()
                .id(100L)
                .batchRef("PUR-2026-00001")
                .totalAmount(new BigDecimal("5000.00"))
                .currencyCode("SAR")
                .itemCount(2)
                .status(PurificationBatchStatus.DRAFT)
                .build();

        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch));

        DisbursementPlan plan = DisbursementPlan.builder()
                .recipientId(11L)
                .amount(new BigDecimal("5000.00"))
                .purpose("Purification donation")
                .build();

        when(recipientRepository.findById(11L)).thenReturn(Optional.of(unapprovedCharity));

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.planDisbursements(100L, List.of(plan)));
        assertTrue(ex.getMessage().contains("not SSB-approved"));
    }

    @Test
    void planDisbursements_exceedsAnnualCap_rejected() {
        // Arrange
        CharityRecipient cappedCharity = CharityRecipient.builder()
                .id(12L)
                .recipientCode("CHR-003")
                .name("Capped Charity")
                .ssbApproved(true)
                .status("ACTIVE")
                .maxAnnualDisbursement(new BigDecimal("1000.00"))
                .totalDisbursedYtd(BigDecimal.ZERO)
                .totalDisbursedLifetime(BigDecimal.ZERO)
                .build();

        PurificationBatch batch = PurificationBatch.builder()
                .id(101L)
                .batchRef("PUR-2026-00002")
                .totalAmount(new BigDecimal("5000.00"))
                .currencyCode("SAR")
                .itemCount(2)
                .status(PurificationBatchStatus.DRAFT)
                .build();

        when(batchRepository.findById(101L)).thenReturn(Optional.of(batch));
        when(recipientRepository.findById(12L)).thenReturn(Optional.of(cappedCharity));

        // Already disbursed 800 this year, trying to add 5000 => 5800 > 1000 cap
        LocalDate yearStart = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        when(disbursementRepository.sumAmountByRecipientIdAndPaymentDateBetween(12L, yearStart, yearEnd))
                .thenReturn(new BigDecimal("800.00"));

        DisbursementPlan plan = DisbursementPlan.builder()
                .recipientId(12L)
                .amount(new BigDecimal("5000.00"))
                .purpose("Purification donation")
                .build();

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.planDisbursements(101L, List.of(plan)));
        assertTrue(ex.getMessage().contains("exceed annual cap"));
    }

    @Test
    void executePurification_marksSnciPurified() {
        // Arrange
        PurificationBatch batch = PurificationBatch.builder()
                .id(200L)
                .batchRef("PUR-2026-00010")
                .totalAmount(new BigDecimal("5000.00"))
                .currencyCode("SAR")
                .itemCount(2)
                .status(PurificationBatchStatus.SSB_APPROVED)
                .build();

        PurificationDisbursement disbursement = PurificationDisbursement.builder()
                .id(300L)
                .batchId(200L)
                .recipientId(10L)
                .amount(new BigDecimal("5000.00"))
                .currencyCode("SAR")
                .paymentStatus(DisbursementPaymentStatus.PENDING)
                .snciRecordIds(List.of(1L, 2L))
                .build();

        // SNCI records linked to batch via PENDING_PURIFICATION status and batchId
        SnciRecord pendingSnci1 = SnciRecord.builder()
                .id(1L)
                .snciRef("SNCI-2026-00001")
                .amount(new BigDecimal("3000.00"))
                .currencyCode("SAR")
                .detectionMethod(DetectionMethod.SCREENING_ALERT)
                .nonComplianceType(NonComplianceType.HARAM_ACTIVITY)
                .quarantineStatus(QuarantineStatus.PENDING_PURIFICATION)
                .purificationBatchId(200L)
                .build();

        SnciRecord pendingSnci2 = SnciRecord.builder()
                .id(2L)
                .snciRef("SNCI-2026-00002")
                .amount(new BigDecimal("2000.00"))
                .currencyCode("SAR")
                .detectionMethod(DetectionMethod.SHARIAH_AUDIT)
                .nonComplianceType(NonComplianceType.STRUCTURAL_VIOLATION)
                .quarantineStatus(QuarantineStatus.PENDING_PURIFICATION)
                .purificationBatchId(200L)
                .build();

        when(batchRepository.findById(200L)).thenReturn(Optional.of(batch));
        when(batchRepository.save(any(PurificationBatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(disbursementRepository.findByBatchId(200L)).thenReturn(List.of(disbursement));
        when(disbursementRepository.save(any(PurificationDisbursement.class))).thenAnswer(inv -> inv.getArgument(0));
        when(recipientRepository.findById(10L)).thenReturn(Optional.of(approvedCharity));
        when(recipientRepository.save(any(CharityRecipient.class))).thenAnswer(inv -> inv.getArgument(0));
        when(snciRepository.findByQuarantineStatusIn(List.of(QuarantineStatus.PENDING_PURIFICATION)))
                .thenReturn(List.of(pendingSnci1, pendingSnci2));
        when(snciRepository.saveAll(anyList())).thenReturn(List.of(pendingSnci1, pendingSnci2));
        when(actorProvider.getCurrentActor()).thenReturn("purification-officer");

        // Act
        service.executePurification(200L);

        // Assert: SNCI records should be set to PURIFIED
        assertEquals(QuarantineStatus.PURIFIED, pendingSnci1.getQuarantineStatus());
        assertEquals(QuarantineStatus.PURIFIED, pendingSnci2.getQuarantineStatus());
        assertNotNull(pendingSnci1.getPurifiedAt());
        assertNotNull(pendingSnci2.getPurifiedAt());

        // Assert: batch finalized
        assertEquals(PurificationBatchStatus.DISBURSED, batch.getStatus());
        assertNotNull(batch.getDisbursedAt());
        assertEquals("purification-officer", batch.getDisbursedBy());
        assertEquals(new BigDecimal("5000.00"), batch.getTotalDisbursed());

        // Assert: disbursement marked SENT
        assertEquals(DisbursementPaymentStatus.SENT, disbursement.getPaymentStatus());

        // Assert: charity recipient totals updated
        verify(recipientRepository).save(any(CharityRecipient.class));
    }

    @Test
    void getCharityFundReport_balanceCorrect() {
        // Arrange
        BigDecimal totalPurified = new BigDecimal("50000.00");
        BigDecimal totalUnpurified = new BigDecimal("10000.00");

        when(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PURIFIED)).thenReturn(totalPurified);
        when(snciRepository.sumTotalUnpurified()).thenReturn(totalUnpurified);

        CharityRecipient recipient1 = CharityRecipient.builder()
                .id(10L)
                .recipientCode("CHR-001")
                .name("Charity A")
                .status("ACTIVE")
                .ssbApproved(true)
                .totalDisbursedLifetime(new BigDecimal("30000.00"))
                .build();

        CharityRecipient recipient2 = CharityRecipient.builder()
                .id(11L)
                .recipientCode("CHR-002")
                .name("Charity B")
                .status("ACTIVE")
                .ssbApproved(true)
                .totalDisbursedLifetime(new BigDecimal("15000.00"))
                .build();

        when(recipientRepository.findByStatus("ACTIVE")).thenReturn(List.of(recipient1, recipient2));

        // Act
        CharityFundReport report = service.getCharityFundReport();

        // Assert
        // totalInFund = totalPurified + totalUnpurified = 50000 + 10000 = 60000
        assertEquals(new BigDecimal("60000.00"), report.getTotalInFund());
        assertEquals(totalPurified, report.getTotalFromSnci());
        // totalDisbursed = 30000 + 15000 = 45000
        assertEquals(new BigDecimal("45000.00"), report.getTotalDisbursed());
        // currentBalance = 60000 - 45000 = 15000
        assertEquals(new BigDecimal("15000.00"), report.getCurrentBalance());
    }
}
