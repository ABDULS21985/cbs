package com.cbs.advertising;
import com.cbs.advertising.entity.AdPlacement;
import com.cbs.advertising.repository.AdPlacementRepository;
import com.cbs.advertising.service.AdvertisingService;
import com.cbs.common.audit.CurrentActorProvider;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdvertisingServiceTest {
    @Mock private AdPlacementRepository repository;
    @Mock private CurrentActorProvider currentActorProvider;
    @InjectMocks private AdvertisingService service;

    @Test @DisplayName("Performance recording auto-calculates CTR")
    void ctrCalculation() {
        AdPlacement ad = new AdPlacement(); ad.setId(1L); ad.setPlacementCode("AD-TEST");
        ad.setSpentAmount(new BigDecimal("5000")); ad.setRevenueAttributed(new BigDecimal("15000"));
        when(repository.findByPlacementCode("AD-TEST")).thenReturn(Optional.of(ad));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        AdPlacement result = service.recordPerformance("AD-TEST", 100000, 2500, 50);
        assertThat(result.getCtrPct()).isEqualByComparingTo("2.5000");
    }

    @Test @DisplayName("ROAS auto-calculated = revenue / spend × 100")
    void roasCalculation() {
        AdPlacement ad = new AdPlacement(); ad.setId(1L); ad.setPlacementCode("AD-ROAS");
        ad.setSpentAmount(new BigDecimal("5000")); ad.setRevenueAttributed(new BigDecimal("15000"));
        when(repository.findByPlacementCode("AD-ROAS")).thenReturn(Optional.of(ad));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        AdPlacement result = service.recordPerformance("AD-ROAS", 50000, 1000, 20);
        assertThat(result.getRoasPct()).isEqualByComparingTo("300.0000");
    }
}
