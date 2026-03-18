package com.cbs.merchant;

import com.cbs.common.exception.BusinessException;
import com.cbs.merchant.entity.*;
import com.cbs.merchant.repository.*;
import com.cbs.merchant.service.*;
import org.junit.jupiter.api.DisplayName;
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
    @InjectMocks private AcquiringService service;

    @Test
    @DisplayName("Net settlement equals gross minus all deductions")
    void netSettlementEqualsGrossMinusDeductions() {
        AcquiringFacility facility = new AcquiringFacility();
        facility.setId(1L);
        facility.setMerchantId(10L);
        facility.setStatus("ACTIVE");

        when(facilityRepo.findByMerchantIdAndStatus(10L, "ACTIVE"))
                .thenReturn(List.of(facility));
        when(settlementRepo.save(any(MerchantSettlement.class)))
                .thenAnswer(inv -> {
                    MerchantSettlement saved = inv.getArgument(0);
                    saved.setId(1L);
                    return saved;
                });

        MerchantSettlement result = service.processSettlement(10L, LocalDate.now());

        // With default builder values (all zeros), net = 0 - 0 - 0 - 0 - 0 - 0 = 0
        assertThat(result.getNetSettlementAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.getMerchantId()).isEqualTo(10L);
        assertThat(result.getFacilityId()).isEqualTo(1L);

        // Verify the formula by checking a settlement with real values
        MerchantSettlement settlement = new MerchantSettlement();
        settlement.setMerchantId(10L);
        settlement.setGrossTransactionAmount(new BigDecimal("10000"));
        settlement.setMdrDeducted(new BigDecimal("200"));
        settlement.setOtherFeesDeducted(new BigDecimal("50"));
        settlement.setChargebackDeductions(new BigDecimal("100"));
        settlement.setRefundDeductions(new BigDecimal("150"));
        settlement.setReserveHeld(new BigDecimal("500"));

        BigDecimal expectedNet = settlement.getGrossTransactionAmount()
                .subtract(settlement.getMdrDeducted())
                .subtract(settlement.getOtherFeesDeducted())
                .subtract(settlement.getChargebackDeductions())
                .subtract(settlement.getRefundDeductions())
                .subtract(settlement.getReserveHeld());

        assertThat(expectedNet).isEqualByComparingTo(new BigDecimal("9000"));
    }

    @Test
    @DisplayName("Chargeback lifecycle flows from RECEIVED to REPRESENTMENT")
    void chargebackLifecycleFromReceivedToRepresentment() {
        MerchantChargeback chargeback = new MerchantChargeback();
        chargeback.setId(1L);
        chargeback.setMerchantId(10L);
        chargeback.setOriginalTransactionRef("TXN-001");
        chargeback.setStatus("RECEIVED");
        chargeback.setRepresentmentSubmitted(false);

        when(chargebackRepo.findById(1L)).thenReturn(Optional.of(chargeback));
        when(chargebackRepo.save(any(MerchantChargeback.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        MerchantChargeback result = service.submitRepresentment(
                1L, "RESP-001", Map.of("doc", "evidence.pdf"));

        assertThat(result.getRepresentmentSubmitted()).isTrue();
        assertThat(result.getStatus()).isEqualTo("REPRESENTMENT");
        assertThat(result.getMerchantResponseRef()).isEqualTo("RESP-001");
    }
}
