package com.cbs.secposition;

import com.cbs.common.exception.BusinessException;
import com.cbs.secposition.entity.*;
import com.cbs.secposition.repository.*;
import com.cbs.secposition.service.*;
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
class ValuationServiceTest {

    @Mock private ValuationModelRepository modelRepo;
    @Mock private ValuationRunRepository runRepo;
    @Mock private InstrumentValuationRepository instrValRepo;
    @InjectMocks private ValuationService service;

    @Test
    @DisplayName("IPV breach detected when deviation exceeds threshold")
    void ipvBreachDetectedWhenDeviationExceedsThreshold() {
        ValuationModel model = new ValuationModel();
        model.setId(1L);
        model.setModelCode("VM-TEST");
        model.setModelName("Test Model");
        model.setIpvThresholdPct(new BigDecimal("5.0"));
        model.setStatus("ACTIVE");

        InstrumentValuation valuation = new InstrumentValuation();
        valuation.setRunId(10L);
        valuation.setInstrumentCode("INST-001");
        valuation.setModelUsed("VM-TEST");
        valuation.setModelPrice(new BigDecimal("100"));
        valuation.setMarketPrice(new BigDecimal("90"));
        valuation.setFairValueLevel("Level1");
        valuation.setDeviationBreached(false);

        when(modelRepo.findByModelCode("VM-TEST")).thenReturn(Optional.of(model));
        when(instrValRepo.save(any(InstrumentValuation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        InstrumentValuation result = service.recordInstrumentValuation(valuation);

        assertThat(result.getDeviationBreached()).isTrue();
        assertThat(result.getPriceDeviation()).isNotNull();
    }

    @Test
    @DisplayName("Level 1/2/3 totals sum correctly on run completion")
    void levelTotalsSumCorrectlyOnRunCompletion() {
        ValuationRun run = new ValuationRun();
        run.setId(1L);
        run.setRunRef("VR-TEST");
        run.setStatus("RUNNING");
        run.setInstrumentsValued(0);

        InstrumentValuation v1 = new InstrumentValuation();
        v1.setId(1L);
        v1.setRunId(1L);
        v1.setFairValueLevel("Level1");
        v1.setMarketPrice(new BigDecimal("1000"));
        v1.setDeviationBreached(false);

        InstrumentValuation v2 = new InstrumentValuation();
        v2.setId(2L);
        v2.setRunId(1L);
        v2.setFairValueLevel("Level2");
        v2.setMarketPrice(new BigDecimal("2000"));
        v2.setDeviationBreached(false);

        InstrumentValuation v3 = new InstrumentValuation();
        v3.setId(3L);
        v3.setRunId(1L);
        v3.setFairValueLevel("Level3");
        v3.setMarketPrice(new BigDecimal("500"));
        v3.setDeviationBreached(false);

        when(runRepo.findByRunRef("VR-TEST")).thenReturn(Optional.of(run));
        when(instrValRepo.findByRunId(1L)).thenReturn(List.of(v1, v2, v3));
        when(runRepo.save(any(ValuationRun.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ValuationRun result = service.completeRun("VR-TEST");

        assertThat(result.getFairValueLevel1Total()).isEqualByComparingTo(new BigDecimal("1000"));
        assertThat(result.getFairValueLevel2Total()).isEqualByComparingTo(new BigDecimal("2000"));
        assertThat(result.getFairValueLevel3Total()).isEqualByComparingTo(new BigDecimal("500"));
        assertThat(result.getInstrumentsValued()).isEqualTo(3);
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
    }
}
