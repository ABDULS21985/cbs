package com.cbs.privateplacement;
import com.cbs.privateplacement.entity.PlacementInvestor;
import com.cbs.privateplacement.entity.PrivatePlacement;
import com.cbs.privateplacement.repository.PlacementInvestorRepository;
import com.cbs.privateplacement.repository.PrivatePlacementRepository;
import com.cbs.privateplacement.service.PrivatePlacementService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrivatePlacementServiceTest {
    @Mock private PrivatePlacementRepository placementRepository;
    @Mock private PlacementInvestorRepository investorRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private PrivatePlacementService service;

    @Test @DisplayName("Close rejects if raised amount is below 80% of target")
    void closeRejectsIfBelowThreshold() {
        PrivatePlacement placement = new PrivatePlacement();
        placement.setId(1L); placement.setPlacementCode("PP-TEST");
        placement.setTargetAmount(new BigDecimal("10000000"));
        placement.setRaisedAmount(new BigDecimal("7000000")); // 70% < 80%
        when(placementRepository.findByPlacementCode("PP-TEST")).thenReturn(Optional.of(placement));

        assertThatThrownBy(() -> service.closePlacement("PP-TEST"))
            .isInstanceOf(com.cbs.common.exception.BusinessException.class)
            .hasMessageContaining("below 80%");
    }

    @Test @DisplayName("Record funding updates investor paid amount and placement raised amount")
    void recordFundingUpdatesAmounts() {
        PrivatePlacement placement = new PrivatePlacement();
        placement.setId(1L); placement.setPlacementCode("PP-TEST2");
        placement.setRaisedAmount(new BigDecimal("5000000"));
        PlacementInvestor investor = new PlacementInvestor();
        investor.setId(10L); investor.setPlacementId(1L);
        investor.setCommitmentAmount(new BigDecimal("2000000"));
        investor.setPaidAmount(BigDecimal.ZERO);
        when(placementRepository.findByPlacementCode("PP-TEST2")).thenReturn(Optional.of(placement));
        when(investorRepository.findById(10L)).thenReturn(Optional.of(investor));
        when(investorRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(placementRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        PlacementInvestor result = service.recordFunding("PP-TEST2", 10L);

        assertThat(result.getPaidAmount()).isEqualByComparingTo("2000000");
        assertThat(result.getStatus()).isEqualTo("FUNDED");
        assertThat(placement.getRaisedAmount()).isEqualByComparingTo("7000000");
    }
}
