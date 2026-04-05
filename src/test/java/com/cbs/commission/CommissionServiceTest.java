package com.cbs.commission;
import com.cbs.common.exception.BusinessException;
import com.cbs.commission.entity.CommissionAgreement;
import com.cbs.commission.entity.CommissionPayout;
import com.cbs.commission.repository.CommissionAgreementRepository;
import com.cbs.commission.repository.CommissionPayoutRepository;
import com.cbs.commission.service.CommissionService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommissionServiceTest {
    @Mock private CommissionAgreementRepository agreementRepository;
    @Mock private CommissionPayoutRepository payoutRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private CommissionService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "taxRate", new BigDecimal("0.10"));
    }

    @Test @DisplayName("Payout calculation: net = gross - tax (10%)")
    void payoutCalculation() {
        CommissionAgreement agreement = new CommissionAgreement(); agreement.setId(1L);
        agreement.setAgreementCode("CA-TEST"); agreement.setBaseRatePct(new BigDecimal("5.0000"));
        agreement.setPartyId("AGT-001"); agreement.setPartyName("Agent Smith"); agreement.setStatus("ACTIVE");
        when(agreementRepository.findByAgreementCode("CA-TEST")).thenReturn(Optional.of(agreement));
        when(payoutRepository.save(any())).thenAnswer(i -> { CommissionPayout p = i.getArgument(0); p.setId(1L); return p; });
        CommissionPayout result = service.calculatePayout("CA-TEST", new BigDecimal("1000000"), new BigDecimal("800000"), "MONTHLY");
        // gross = 800000 * 5% = 40000, tax = 4000, net = 36000
        assertThat(result.getGrossCommission()).isEqualByComparingTo("40000.0000");
        assertThat(result.getTaxAmount()).isEqualByComparingTo("4000.0000");
        assertThat(result.getNetCommission()).isEqualByComparingTo("36000.0000");
    }

    @Test @DisplayName("Cannot approve already-paid payout")
    void cannotApproveAlreadyPaid() {
        CommissionPayout payout = new CommissionPayout(); payout.setId(1L); payout.setPayoutCode("CP-PAID");
        payout.setStatus("PAID");
        when(payoutRepository.findByPayoutCode("CP-PAID")).thenReturn(Optional.of(payout));
        assertThatThrownBy(() -> service.approvePayout("CP-PAID"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("already PAID");
    }
}
