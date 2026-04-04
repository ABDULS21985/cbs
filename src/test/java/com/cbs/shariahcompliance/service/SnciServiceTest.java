package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.shariahcompliance.dto.CreateSnciRecordRequest;
import com.cbs.shariahcompliance.dto.SnciRecordResponse;
import com.cbs.shariahcompliance.entity.*;
import com.cbs.shariahcompliance.repository.ShariahComplianceAlertRepository;
import com.cbs.shariahcompliance.repository.SnciRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SnciServiceTest {

    @Mock
    SnciRecordRepository snciRepository;
    @Mock
    ShariahComplianceAlertRepository alertRepository;
    @Mock
    CurrentActorProvider actorProvider;

    @InjectMocks
    SnciService service;

    private SnciRecord detectedRecord;
    private SnciRecord quarantinedRecord;
    private SnciRecord disputedRecord;

    @BeforeEach
    void setUp() {
        detectedRecord = SnciRecord.builder()
                .id(1L)
                .snciRef("SNCI-2026-00001")
                .amount(new BigDecimal("1500.00"))
                .currencyCode("SAR")
                .detectionDate(LocalDate.now())
                .detectionMethod(DetectionMethod.SCREENING_ALERT)
                .nonComplianceType(NonComplianceType.HARAM_ACTIVITY)
                .quarantineStatus(QuarantineStatus.DETECTED)
                .build();

        quarantinedRecord = SnciRecord.builder()
                .id(2L)
                .snciRef("SNCI-2026-00002")
                .amount(new BigDecimal("2500.00"))
                .currencyCode("SAR")
                .detectionDate(LocalDate.now())
                .detectionMethod(DetectionMethod.SCREENING_ALERT)
                .nonComplianceType(NonComplianceType.HARAM_ACTIVITY)
                .quarantineStatus(QuarantineStatus.QUARANTINED)
                .build();

        disputedRecord = SnciRecord.builder()
                .id(3L)
                .snciRef("SNCI-2026-00003")
                .amount(new BigDecimal("3000.00"))
                .currencyCode("SAR")
                .detectionDate(LocalDate.now())
                .detectionMethod(DetectionMethod.SCREENING_ALERT)
                .nonComplianceType(NonComplianceType.RIBA_ELEMENT)
                .quarantineStatus(QuarantineStatus.DISPUTED)
                .disputedBy("customer-rep")
                .disputeReason("Transaction was misclassified")
                .build();
    }

    @Test
    void createSnciRecord_fromAlert_linkedToAlert() {
        // Arrange
        ShariahComplianceAlert alert = ShariahComplianceAlert.builder()
                .id(100L)
                .alertRef("SCA-2026-00001")
                .status(AlertStatus.NEW)
                .severity(ScreeningSeverity.CRITICAL)
                .alertType(AlertType.HARAM_ACTIVITY)
                .generatedSnciRecord(false)
                .slaBreach(false)
                .build();

        CreateSnciRecordRequest request = CreateSnciRecordRequest.builder()
                .detectionMethod("SCREENING_ALERT")
                .detectionSource("Shariah Screening Service")
                .sourceTransactionRef("TXN-101")
                .amount(new BigDecimal("5000.00"))
                .currencyCode("SAR")
                .nonComplianceType("HARAM_ACTIVITY")
                .nonComplianceDescription("Haram MCC detected")
                .alertId(100L)
                .build();

        when(alertRepository.findById(100L)).thenReturn(Optional.of(alert));
        when(snciRepository.save(any(SnciRecord.class))).thenAnswer(inv -> {
            SnciRecord r = inv.getArgument(0);
            r.setId(10L);
            return r;
        });

        // Act
        SnciRecordResponse response = service.createSnciRecord(request);

        // Assert
        assertNotNull(response);
        assertEquals(new BigDecimal("5000.00"), response.getAmount());
        assertEquals(QuarantineStatus.DETECTED, response.getQuarantineStatus());
        assertEquals(DetectionMethod.SCREENING_ALERT, response.getDetectionMethod());
        assertEquals(100L, response.getAlertId());

        // Verify alert was updated with SNCI link
        verify(alertRepository, atLeastOnce()).save(any(ShariahComplianceAlert.class));
        assertTrue(alert.isGeneratedSnciRecord());
    }

    @Test
    void quarantineIncome_setsQuarantinedStatus() {
        // Arrange
        when(snciRepository.findById(1L)).thenReturn(Optional.of(detectedRecord));
        when(snciRepository.save(any(SnciRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        service.quarantineIncome(1L);

        // Assert
        ArgumentCaptor<SnciRecord> captor = ArgumentCaptor.forClass(SnciRecord.class);
        verify(snciRepository).save(captor.capture());

        SnciRecord saved = captor.getValue();
        assertEquals(QuarantineStatus.QUARANTINED, saved.getQuarantineStatus());
        assertNotNull(saved.getQuarantinedAt());
        assertNotNull(saved.getQuarantineGlAccount());
    }

    @Test
    void quarantineIncome_alreadyQuarantined_throwsException() {
        // Arrange
        when(snciRepository.findById(2L)).thenReturn(Optional.of(quarantinedRecord));

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.quarantineIncome(2L));
        assertTrue(ex.getMessage().contains("cannot be quarantined"));
        verify(snciRepository, never()).save(any(SnciRecord.class));
    }

    @Test
    void disputeSnci_changesStatusToDisputed() {
        // Arrange
        when(snciRepository.findById(2L)).thenReturn(Optional.of(quarantinedRecord));
        when(snciRepository.save(any(SnciRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        service.disputeSnci(2L, "customer-rep", "Transaction was legitimate");

        // Assert
        ArgumentCaptor<SnciRecord> captor = ArgumentCaptor.forClass(SnciRecord.class);
        verify(snciRepository).save(captor.capture());

        SnciRecord saved = captor.getValue();
        assertEquals(QuarantineStatus.DISPUTED, saved.getQuarantineStatus());
        assertEquals("customer-rep", saved.getDisputedBy());
        assertEquals("Transaction was legitimate", saved.getDisputeReason());
    }

    @Test
    void resolveDispute_compliant_waived() {
        // Arrange
        when(snciRepository.findById(3L)).thenReturn(Optional.of(disputedRecord));
        when(snciRepository.save(any(SnciRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act: resolve as compliant (isNonCompliant = false)
        service.resolveDispute(3L, false, "ssb-reviewer", "Income found compliant after review");

        // Assert
        ArgumentCaptor<SnciRecord> captor = ArgumentCaptor.forClass(SnciRecord.class);
        verify(snciRepository).save(captor.capture());

        SnciRecord saved = captor.getValue();
        assertEquals(QuarantineStatus.WAIVED_BY_SSB, saved.getQuarantineStatus());
        assertEquals("ssb-reviewer", saved.getDisputeResolvedBy());
        assertNotNull(saved.getDisputeResolvedAt());
        assertNull(saved.getQuarantineGlAccount());
        assertNull(saved.getQuarantinedAt());
    }

    @Test
    void resolveDispute_nonCompliant_reQuarantined() {
        // Arrange
        when(snciRepository.findById(3L)).thenReturn(Optional.of(disputedRecord));
        when(snciRepository.save(any(SnciRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act: resolve as non-compliant (isNonCompliant = true)
        service.resolveDispute(3L, true, "ssb-reviewer", "Income confirmed non-compliant");

        // Assert
        ArgumentCaptor<SnciRecord> captor = ArgumentCaptor.forClass(SnciRecord.class);
        verify(snciRepository).save(captor.capture());

        SnciRecord saved = captor.getValue();
        assertEquals(QuarantineStatus.QUARANTINED, saved.getQuarantineStatus());
        assertEquals("ssb-reviewer", saved.getDisputeResolvedBy());
        assertNotNull(saved.getDisputeResolvedAt());
    }

    @Test
    void getTotalUnpurifiedSnci_correct() {
        // Arrange: sum of QUARANTINED + PENDING_PURIFICATION amounts
        BigDecimal expectedTotal = new BigDecimal("7500.00");
        when(snciRepository.sumTotalUnpurified()).thenReturn(expectedTotal);

        // Act
        BigDecimal result = service.getTotalUnpurifiedSnci();

        // Assert
        assertEquals(expectedTotal, result);
        verify(snciRepository).sumTotalUnpurified();
    }
}
