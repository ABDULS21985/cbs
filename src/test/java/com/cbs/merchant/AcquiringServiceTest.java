package com.cbs.merchant;

import com.cbs.card.repository.CardTransactionRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.merchant.entity.*;
import com.cbs.merchant.repository.*;
import com.cbs.merchant.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AcquiringServiceTest {

    @Mock private AcquiringFacilityRepository facilityRepo;
    @Mock private MerchantSettlementRepository settlementRepo;
    @Mock private MerchantChargebackRepository chargebackRepo;
    @Mock private MerchantProfileRepository merchantProfileRepo;
    @Mock private CardTransactionRepository cardTransactionRepo;
    @InjectMocks private AcquiringService service;

    // ── Facility Tests ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Facility Operations")
    class FacilityTests {

        @Test
        @DisplayName("setupFacility sets status to SETUP and persists")
        void setupFacilitySetsStatusToSetup() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .merchantId(10L)
                    .facilityType("CARD_PRESENT")
                    .processorConnection("VISA")
                    .build();

            when(facilityRepo.save(any(AcquiringFacility.class)))
                    .thenAnswer(inv -> { AcquiringFacility f = inv.getArgument(0); f.setId(1L); return f; });

            AcquiringFacility result = service.setupFacility(facility);

            assertThat(result.getStatus()).isEqualTo("SETUP");
            assertThat(result.getMerchantId()).isEqualTo(10L);
            verify(facilityRepo).save(any(AcquiringFacility.class));
        }

        @Test
        @DisplayName("activateFacility sets status to ACTIVE")
        void activateFacilitySetsStatusToActive() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .id(1L).merchantId(10L).status("SETUP").build();

            when(facilityRepo.findById(1L)).thenReturn(Optional.of(facility));
            when(facilityRepo.save(any(AcquiringFacility.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            AcquiringFacility result = service.activateFacility(1L);

            assertThat(result.getStatus()).isEqualTo("ACTIVE");
        }

        @Test
        @DisplayName("activateFacility throws when facility not found")
        void activateFacilityThrowsNotFound() {
            when(facilityRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.activateFacility(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ── Settlement Tests ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Settlement Processing")
    class SettlementTests {

        private void setupCommonSettlementMocks(Long merchantId, AcquiringFacility facility) {
            when(facilityRepo.findByMerchantIdAndStatus(merchantId, "ACTIVE"))
                    .thenReturn(List.of(facility));
            when(settlementRepo.findByMerchantIdAndSettlementDate(eq(merchantId), any()))
                    .thenReturn(List.of());
            when(chargebackRepo.findByMerchantIdOrderByTransactionDateDesc(merchantId))
                    .thenReturn(List.of());
            when(settlementRepo.save(any(MerchantSettlement.class)))
                    .thenAnswer(inv -> { MerchantSettlement s = inv.getArgument(0); s.setId(1L); return s; });
        }

        @Test
        @DisplayName("Settlement uses real CardTransaction ledger when data exists")
        void settlementUsesLedgerData() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .id(1L).merchantId(10L).status("ACTIVE")
                    .mdrRatePct(new BigDecimal("1.50"))
                    .reserveHoldPct(new BigDecimal("5.00"))
                    .build();

            MerchantProfile profile = MerchantProfile.builder()
                    .id(10L).merchantId("MCH-ACME001234").build();

            setupCommonSettlementMocks(10L, facility);
            when(merchantProfileRepo.findById(10L)).thenReturn(Optional.of(profile));

            // Simulate real ledger data: 150 card transactions totaling 250,000
            when(cardTransactionRepo.sumGrossByMerchantAndDate("MCH-ACME001234", LocalDate.of(2026, 3, 20)))
                    .thenReturn(new BigDecimal("250000.00"));
            when(cardTransactionRepo.countByMerchantAndDate("MCH-ACME001234", LocalDate.of(2026, 3, 20)))
                    .thenReturn(150L);
            when(cardTransactionRepo.sumRefundsByMerchantAndDate("MCH-ACME001234", LocalDate.of(2026, 3, 20)))
                    .thenReturn(new BigDecimal("2000.00"));

            MerchantSettlement result = service.processSettlement(10L, LocalDate.of(2026, 3, 20));

            // Verify ledger data was used
            assertThat(result.getGrossTransactionAmount()).isEqualByComparingTo(new BigDecimal("250000.00"));
            assertThat(result.getTransactionCount()).isEqualTo(150);
            assertThat(result.getRefundDeductions()).isEqualByComparingTo(new BigDecimal("2000.00"));

            // Verify calculations: MDR = 250000 * 1.50 / 100 = 3750
            assertThat(result.getMdrDeducted()).isEqualByComparingTo(new BigDecimal("3750"));
            // Other fees = 250000 * 0.15 / 100 = 375
            assertThat(result.getOtherFeesDeducted()).isEqualByComparingTo(new BigDecimal("375"));
            // Reserve = 250000 * 5.00 / 100 = 12500
            assertThat(result.getReserveHeld()).isEqualByComparingTo(new BigDecimal("12500"));
            // Net = 250000 - 3750 - 375 - 0 - 2000 - 12500 = 231375
            assertThat(result.getNetSettlementAmount()).isEqualByComparingTo(new BigDecimal("231375"));
        }

        @Test
        @DisplayName("Settlement falls back to facility limit when no ledger data")
        void settlementFallsBackToFacilityLimit() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .id(1L).merchantId(10L).status("ACTIVE")
                    .dailyTransactionLimit(new BigDecimal("100000"))
                    .mdrRatePct(new BigDecimal("1.50"))
                    .reserveHoldPct(new BigDecimal("5.00"))
                    .build();

            MerchantProfile profile = MerchantProfile.builder()
                    .id(10L).merchantId("MCH-EMPTY00001").build();

            setupCommonSettlementMocks(10L, facility);
            when(merchantProfileRepo.findById(10L)).thenReturn(Optional.of(profile));

            // No ledger data — returns zero
            when(cardTransactionRepo.sumGrossByMerchantAndDate("MCH-EMPTY00001", LocalDate.of(2026, 3, 20)))
                    .thenReturn(BigDecimal.ZERO);
            when(cardTransactionRepo.countByMerchantAndDate("MCH-EMPTY00001", LocalDate.of(2026, 3, 20)))
                    .thenReturn(0L);
            when(cardTransactionRepo.sumRefundsByMerchantAndDate("MCH-EMPTY00001", LocalDate.of(2026, 3, 20)))
                    .thenReturn(BigDecimal.ZERO);

            MerchantSettlement result = service.processSettlement(10L, LocalDate.of(2026, 3, 20));

            // Falls back to facility daily limit
            assertThat(result.getGrossTransactionAmount()).isEqualByComparingTo(new BigDecimal("100000"));
            assertThat(result.getRefundDeductions()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Settlement uses default 50000 when no ledger data and no facility limit")
        void settlementUsesDefaultWhenNoLimitConfigured() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .id(1L).merchantId(10L).status("ACTIVE")
                    .build(); // No dailyTransactionLimit

            setupCommonSettlementMocks(10L, facility);
            when(merchantProfileRepo.findById(10L)).thenReturn(Optional.empty());

            MerchantSettlement result = service.processSettlement(10L, LocalDate.now());

            assertThat(result.getGrossTransactionAmount())
                    .isEqualByComparingTo(new BigDecimal("50000.00"));
        }

        @Test
        @DisplayName("Settlement populates settlement account from merchant profile")
        void settlementPopulatesSettlementAccount() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .id(1L).merchantId(10L).status("ACTIVE").build();

            MerchantProfile profile = MerchantProfile.builder()
                    .id(10L).merchantId("MCH-ACCT001234")
                    .settlementAccountId(42L).build();

            setupCommonSettlementMocks(10L, facility);
            when(merchantProfileRepo.findById(10L)).thenReturn(Optional.of(profile));
            when(cardTransactionRepo.sumGrossByMerchantAndDate(anyString(), any())).thenReturn(BigDecimal.ZERO);
            when(cardTransactionRepo.countByMerchantAndDate(anyString(), any())).thenReturn(0L);
            when(cardTransactionRepo.sumRefundsByMerchantAndDate(anyString(), any())).thenReturn(BigDecimal.ZERO);

            MerchantSettlement result = service.processSettlement(10L, LocalDate.now());

            assertThat(result.getSettlementAccountId()).isEqualTo(42L);
        }

        @Test
        @DisplayName("Settlement throws when no active facility found")
        void settlementThrowsWhenNoActiveFacility() {
            when(facilityRepo.findByMerchantIdAndStatus(10L, "ACTIVE"))
                    .thenReturn(List.of());

            assertThatThrownBy(() -> service.processSettlement(10L, LocalDate.now()))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("No active acquiring facility");
        }

        @Test
        @DisplayName("Settlement throws on duplicate date")
        void settlementThrowsOnDuplicateDate() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .id(1L).merchantId(10L).status("ACTIVE").build();

            when(facilityRepo.findByMerchantIdAndStatus(10L, "ACTIVE"))
                    .thenReturn(List.of(facility));

            MerchantSettlement existing = MerchantSettlement.builder().id(99L).build();
            when(settlementRepo.findByMerchantIdAndSettlementDate(10L, LocalDate.of(2026, 3, 20)))
                    .thenReturn(List.of(existing));

            assertThatThrownBy(() -> service.processSettlement(10L, LocalDate.of(2026, 3, 20)))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Settlement already exists");
        }

        @Test
        @DisplayName("Settlement includes chargeback deductions for MERCHANT_LOSS chargebacks")
        void settlementIncludesChargebackDeductions() {
            AcquiringFacility facility = AcquiringFacility.builder()
                    .id(1L).merchantId(10L).status("ACTIVE")
                    .dailyTransactionLimit(new BigDecimal("50000"))
                    .mdrRatePct(BigDecimal.ZERO)
                    .reserveHoldPct(BigDecimal.ZERO)
                    .build();

            MerchantChargeback cb1 = MerchantChargeback.builder()
                    .merchantId(10L)
                    .transactionDate(LocalDate.of(2026, 3, 10))
                    .chargebackAmount(new BigDecimal("5000"))
                    .status("CLOSED")
                    .outcome("MERCHANT_LOSS")
                    .build();

            MerchantChargeback cb2 = MerchantChargeback.builder()
                    .merchantId(10L)
                    .transactionDate(LocalDate.of(2026, 3, 15))
                    .chargebackAmount(new BigDecimal("3000"))
                    .status("RECEIVED")
                    .build();

            when(facilityRepo.findByMerchantIdAndStatus(10L, "ACTIVE"))
                    .thenReturn(List.of(facility));
            when(settlementRepo.findByMerchantIdAndSettlementDate(eq(10L), any()))
                    .thenReturn(List.of());
            when(chargebackRepo.findByMerchantIdOrderByTransactionDateDesc(10L))
                    .thenReturn(List.of(cb1, cb2));
            when(settlementRepo.save(any(MerchantSettlement.class)))
                    .thenAnswer(inv -> { MerchantSettlement s = inv.getArgument(0); s.setId(1L); return s; });
            when(merchantProfileRepo.findById(10L)).thenReturn(Optional.empty());

            MerchantSettlement result = service.processSettlement(10L, LocalDate.of(2026, 3, 20));

            assertThat(result.getChargebackDeductions())
                    .isEqualByComparingTo(new BigDecimal("8000"));
        }
    }

    // ── Chargeback Tests ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Chargeback Operations")
    class ChargebackTests {

        @Test
        @DisplayName("recordChargeback sets RECEIVED status and clears flags")
        void recordChargebackSetsReceivedStatus() {
            MerchantChargeback cb = MerchantChargeback.builder()
                    .merchantId(10L)
                    .originalTransactionRef("TXN-001")
                    .chargebackAmount(new BigDecimal("15000"))
                    .build();

            when(chargebackRepo.save(any(MerchantChargeback.class)))
                    .thenAnswer(inv -> { MerchantChargeback c = inv.getArgument(0); c.setId(1L); return c; });

            MerchantChargeback result = service.recordChargeback(cb);

            assertThat(result.getStatus()).isEqualTo("RECEIVED");
            assertThat(result.getRepresentmentSubmitted()).isFalse();
            assertThat(result.getArbitrationRequired()).isFalse();
        }

        @Test
        @DisplayName("Chargeback lifecycle flows from RECEIVED to REPRESENTMENT")
        void chargebackLifecycleFromReceivedToRepresentment() {
            MerchantChargeback chargeback = MerchantChargeback.builder()
                    .id(1L).merchantId(10L).originalTransactionRef("TXN-001")
                    .status("RECEIVED").representmentSubmitted(false)
                    .build();

            when(chargebackRepo.findById(1L)).thenReturn(Optional.of(chargeback));
            when(chargebackRepo.save(any(MerchantChargeback.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            MerchantChargeback result = service.submitRepresentment(
                    1L, "RESP-001", Map.of("doc", "evidence.pdf"));

            assertThat(result.getRepresentmentSubmitted()).isTrue();
            assertThat(result.getStatus()).isEqualTo("REPRESENTMENT");
            assertThat(result.getMerchantResponseRef()).isEqualTo("RESP-001");
            assertThat(result.getMerchantEvidence()).containsKey("doc");
        }

        @Test
        @DisplayName("Cannot submit representment for CLOSED chargeback")
        void cannotSubmitRepresentmentForClosedChargeback() {
            MerchantChargeback chargeback = MerchantChargeback.builder()
                    .id(1L).merchantId(10L).status("CLOSED").build();

            when(chargebackRepo.findById(1L)).thenReturn(Optional.of(chargeback));

            assertThatThrownBy(() -> service.submitRepresentment(1L, "REF", Map.of()))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot submit representment");
        }

        @Test
        @DisplayName("Cannot submit representment for already REPRESENTMENT chargeback")
        void cannotSubmitRepresentmentForAlreadySubmitted() {
            MerchantChargeback chargeback = MerchantChargeback.builder()
                    .id(1L).merchantId(10L).status("REPRESENTMENT").build();

            when(chargebackRepo.findById(1L)).thenReturn(Optional.of(chargeback));

            assertThatThrownBy(() -> service.submitRepresentment(1L, "REF", Map.of()))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot submit representment");
        }

        @Test
        @DisplayName("submitRepresentment throws when chargeback not found")
        void submitRepresentmentThrowsNotFound() {
            when(chargebackRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.submitRepresentment(999L, "REF", Map.of()))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ── PCI Compliance Tests ────────────────────────────────────────────────────

    @Nested
    @DisplayName("PCI Compliance")
    class PciComplianceTests {

        @Test
        @DisplayName("PCI compliance report groups facilities by status")
        void pciComplianceReportGroupsByStatus() {
            AcquiringFacility compliant = AcquiringFacility.builder()
                    .id(1L).pciComplianceStatus("COMPLIANT").build();
            AcquiringFacility pending = AcquiringFacility.builder()
                    .id(2L).pciComplianceStatus("PENDING_SAQ").build();
            AcquiringFacility nonCompliant = AcquiringFacility.builder()
                    .id(3L).pciComplianceStatus("NON_COMPLIANT").build();
            AcquiringFacility nullStatus = AcquiringFacility.builder()
                    .id(4L).pciComplianceStatus(null).build();

            when(facilityRepo.findAll()).thenReturn(List.of(compliant, pending, nonCompliant, nullStatus));

            Map<String, List<AcquiringFacility>> report = service.getPciComplianceReport();

            assertThat(report).containsKeys("COMPLIANT", "PENDING_SAQ", "NON_COMPLIANT", "UNKNOWN");
            assertThat(report.get("COMPLIANT")).hasSize(1);
            assertThat(report.get("UNKNOWN")).hasSize(1);
        }
    }
}
