package com.cbs.salesplan;
import com.cbs.salesplan.entity.SalesTarget;
import com.cbs.salesplan.repository.SalesPlanRepository;
import com.cbs.salesplan.repository.SalesTargetRepository;
import com.cbs.salesplan.service.SalesPlanService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesPlanServiceTest {
    @Mock private SalesPlanRepository planRepository;
    @Mock private SalesTargetRepository targetRepository;
    @InjectMocks private SalesPlanService service;

    @Test @DisplayName("Recording actual recalculates achievementPct")
    void recordActualCalcsAchievement() {
        SalesTarget t = new SalesTarget(); t.setId(1L); t.setTargetCode("ST-TEST");
        t.setTargetValue(new BigDecimal("100000")); t.setStatus("ACTIVE");
        when(targetRepository.findByTargetCode("ST-TEST")).thenReturn(Optional.of(t));
        when(targetRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        SalesTarget result = service.recordActual("ST-TEST", new BigDecimal("75000"));
        assertThat(result.getAchievementPct()).isEqualByComparingTo("75.0000");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }

    @Test @DisplayName("Achievement ≥ 100% auto-sets ACHIEVED")
    void achievedAutoStatus() {
        SalesTarget t = new SalesTarget(); t.setId(1L); t.setTargetCode("ST-DONE");
        t.setTargetValue(new BigDecimal("50000")); t.setStatus("ACTIVE");
        when(targetRepository.findByTargetCode("ST-DONE")).thenReturn(Optional.of(t));
        when(targetRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        SalesTarget result = service.recordActual("ST-DONE", new BigDecimal("55000"));
        assertThat(result.getAchievementPct()).isGreaterThanOrEqualTo(new BigDecimal("100"));
        assertThat(result.getStatus()).isEqualTo("ACHIEVED");
    }
}
