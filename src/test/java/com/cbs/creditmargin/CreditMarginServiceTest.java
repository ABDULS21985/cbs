package com.cbs.creditmargin;
import com.cbs.creditmargin.entity.MarginCall;
import com.cbs.creditmargin.repository.MarginCallRepository;
import com.cbs.creditmargin.repository.CollateralPositionRepository;
import com.cbs.creditmargin.service.CreditMarginService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditMarginServiceTest {
    @Mock private MarginCallRepository callRepository;
    @Mock private CollateralPositionRepository collateralRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private CreditMarginService service;

    @Test @DisplayName("Full settlement updates amount and status to SETTLED")
    void fullSettlement() {
        MarginCall call = new MarginCall(); call.setId(1L); call.setCallRef("MC-TEST");
        call.setCallAmount(new BigDecimal("1000000")); call.setSettledAmount(BigDecimal.ZERO); call.setStatus("ISSUED");
        when(callRepository.findByCallRef("MC-TEST")).thenReturn(Optional.of(call));
        when(callRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        MarginCall result = service.settleCall("MC-TEST", new BigDecimal("1000000"), "CASH");
        assertThat(result.getStatus()).isEqualTo("SETTLED");
        assertThat(result.getSettledAmount()).isEqualByComparingTo("1000000");
    }

    @Test @DisplayName("Partial settlement → PARTIALLY_SETTLED")
    void partialSettlement() {
        MarginCall call = new MarginCall(); call.setId(1L); call.setCallRef("MC-PART");
        call.setCallAmount(new BigDecimal("1000000")); call.setSettledAmount(BigDecimal.ZERO); call.setStatus("ISSUED");
        when(callRepository.findByCallRef("MC-PART")).thenReturn(Optional.of(call));
        when(callRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        MarginCall result = service.settleCall("MC-PART", new BigDecimal("400000"), "GOVERNMENT_BOND");
        assertThat(result.getStatus()).isEqualTo("PARTIALLY_SETTLED");
        assertThat(result.getSettledAmount()).isEqualByComparingTo("400000");
    }
}
