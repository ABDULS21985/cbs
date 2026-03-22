package com.cbs.secposition;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.secposition.entity.InstrumentValuation;
import com.cbs.secposition.entity.ValuationModel;
import com.cbs.secposition.entity.ValuationRun;
import com.cbs.secposition.repository.InstrumentValuationRepository;
import com.cbs.secposition.repository.ValuationModelRepository;
import com.cbs.secposition.repository.ValuationRunRepository;
import com.cbs.secposition.service.ValuationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ValuationServiceTest {

    @Mock private ValuationModelRepository modelRepo;
    @Mock private ValuationRunRepository runRepo;
    @Mock private InstrumentValuationRepository instrValRepo;
    @InjectMocks private ValuationService service;

    // ── defineModel ─────────────────────────────────────────────────────

    @Test
    @DisplayName("defineModel - generates modelCode starting with VM- and sets status=DEVELOPMENT")
    void defineModel_generatesCodeAndSetsStatus() {
        when(modelRepo.save(any(ValuationModel.class))).thenAnswer(inv -> {
            ValuationModel m = inv.getArgument(0);
            m.setId(1L);
            return m;
        });

        ValuationModel model = new ValuationModel();
        model.setModelName("DCF Model");
        model.setInstrumentType("BOND");
        model.setValuationMethodology("DISCOUNTED_CASH_FLOW");

        ValuationModel result = service.defineModel(model);

        assertThat(result.getModelCode()).startsWith("VM-");
        assertThat(result.getModelCode()).hasSize(13); // "VM-" + 10 chars
        assertThat(result.getStatus()).isEqualTo("DEVELOPMENT");
        verify(modelRepo).save(model);
    }

    // ── runValuation ────────────────────────────────────────────────────

    @Test
    @DisplayName("runValuation - creates run with correct runRef, status, modelId, valuationDate, runType")
    void runValuation_createsRunWithCorrectFields() {
        when(runRepo.save(any(ValuationRun.class))).thenAnswer(inv -> {
            ValuationRun r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        LocalDate date = LocalDate.of(2026, 3, 22);
        ValuationRun result = service.runValuation(10L, date, "END_OF_DAY");

        assertThat(result.getRunRef()).startsWith("VR-");
        assertThat(result.getRunRef()).hasSize(13);
        assertThat(result.getStatus()).isEqualTo("RUNNING");
        assertThat(result.getModelId()).isEqualTo(10L);
        assertThat(result.getValuationDate()).isEqualTo(date);
        assertThat(result.getRunType()).isEqualTo("END_OF_DAY");
        assertThat(result.getRunStartedAt()).isNotNull();
        verify(runRepo).save(any(ValuationRun.class));
    }

    // ── recordInstrumentValuation ───────────────────────────────────────

    @Test
    @DisplayName("recordInstrumentValuation - calculates deviation and flags breach when above threshold")
    void recordInstrumentValuation_calculatesDeviation() {
        ValuationModel model = new ValuationModel();
        model.setId(1L);
        model.setModelCode("VM-TEST");
        model.setIpvThresholdPct(new BigDecimal("5.0"));

        when(modelRepo.findByModelCode("VM-TEST")).thenReturn(Optional.of(model));
        when(instrValRepo.save(any(InstrumentValuation.class))).thenAnswer(inv -> inv.getArgument(0));

        InstrumentValuation valuation = new InstrumentValuation();
        valuation.setRunId(10L);
        valuation.setInstrumentCode("INST-001");
        valuation.setModelUsed("VM-TEST");
        valuation.setModelPrice(new BigDecimal("100"));
        valuation.setMarketPrice(new BigDecimal("95"));
        valuation.setFairValueLevel("Level1");
        valuation.setDeviationBreached(false);

        InstrumentValuation result = service.recordInstrumentValuation(valuation);

        // deviation = |100 - 95| / 95 * 100 = 5.263157... %
        BigDecimal expectedDeviation = new BigDecimal("100").subtract(new BigDecimal("95"))
                .abs()
                .divide(new BigDecimal("95"), 6, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));

        assertThat(result.getPriceDeviation()).isEqualByComparingTo(expectedDeviation);
        // 5.26% > 5.0% threshold => breached
        assertThat(result.getDeviationBreached()).isTrue();
    }

    // ── completeRun ─────────────────────────────────────────────────────

    @Test
    @DisplayName("completeRun - aggregates fair value level totals and ipvBreachCount correctly")
    void completeRun_aggregatesFairValueLevels() {
        ValuationRun run = new ValuationRun();
        run.setId(1L);
        run.setRunRef("VR-AGG");
        run.setStatus("RUNNING");
        run.setInstrumentsValued(0);

        InstrumentValuation v1 = new InstrumentValuation();
        v1.setFairValueLevel("Level1");
        v1.setMarketPrice(new BigDecimal("1000"));
        v1.setDeviationBreached(false);

        InstrumentValuation v2 = new InstrumentValuation();
        v2.setFairValueLevel("Level1");
        v2.setMarketPrice(new BigDecimal("2000"));
        v2.setDeviationBreached(false);

        InstrumentValuation v3 = new InstrumentValuation();
        v3.setFairValueLevel("Level2");
        v3.setMarketPrice(new BigDecimal("3000"));
        v3.setDeviationBreached(true);

        InstrumentValuation v4 = new InstrumentValuation();
        v4.setFairValueLevel("Level3");
        v4.setMarketPrice(new BigDecimal("500"));
        v4.setDeviationBreached(false);

        when(runRepo.findByRunRef("VR-AGG")).thenReturn(Optional.of(run));
        when(instrValRepo.findByRunId(1L)).thenReturn(List.of(v1, v2, v3, v4));
        when(runRepo.save(any(ValuationRun.class))).thenAnswer(inv -> inv.getArgument(0));

        ValuationRun result = service.completeRun("VR-AGG");

        assertThat(result.getFairValueLevel1Total()).isEqualByComparingTo(new BigDecimal("3000")); // 1000 + 2000
        assertThat(result.getFairValueLevel2Total()).isEqualByComparingTo(new BigDecimal("3000"));
        assertThat(result.getFairValueLevel3Total()).isEqualByComparingTo(new BigDecimal("500"));
        assertThat(result.getInstrumentsValued()).isEqualTo(4);
        assertThat(result.getIpvBreachCount()).isEqualTo(1);
        assertThat(result.getRunCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("completeRun - sets COMPLETED_WITH_EXCEPTIONS when breaches exist")
    void completeRun_setsCompletedWithExceptions_whenBreaches() {
        ValuationRun run = new ValuationRun();
        run.setId(2L);
        run.setRunRef("VR-EXC");
        run.setStatus("RUNNING");
        run.setInstrumentsValued(0);

        InstrumentValuation v1 = new InstrumentValuation();
        v1.setFairValueLevel("Level1");
        v1.setMarketPrice(new BigDecimal("1000"));
        v1.setDeviationBreached(true);

        InstrumentValuation v2 = new InstrumentValuation();
        v2.setFairValueLevel("Level2");
        v2.setMarketPrice(new BigDecimal("2000"));
        v2.setDeviationBreached(true);

        when(runRepo.findByRunRef("VR-EXC")).thenReturn(Optional.of(run));
        when(instrValRepo.findByRunId(2L)).thenReturn(List.of(v1, v2));
        when(runRepo.save(any(ValuationRun.class))).thenAnswer(inv -> inv.getArgument(0));

        ValuationRun result = service.completeRun("VR-EXC");

        assertThat(result.getStatus()).isEqualTo("COMPLETED_WITH_EXCEPTIONS");
        assertThat(result.getIpvBreachCount()).isEqualTo(2);
    }

    // ── getExceptions ───────────────────────────────────────────────────

    @Test
    @DisplayName("getExceptions - delegates to findByRunIdAndDeviationBreachedTrue")
    void getExceptions_returnsOnlyBreachedInstruments() {
        ValuationRun run = new ValuationRun();
        run.setId(5L);
        run.setRunRef("VR-BREACH");

        InstrumentValuation breached = new InstrumentValuation();
        breached.setDeviationBreached(true);
        breached.setInstrumentCode("INST-BREACH");

        when(runRepo.findByRunRef("VR-BREACH")).thenReturn(Optional.of(run));
        when(instrValRepo.findByRunIdAndDeviationBreachedTrue(5L)).thenReturn(List.of(breached));

        List<InstrumentValuation> result = service.getExceptions("VR-BREACH");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getInstrumentCode()).isEqualTo("INST-BREACH");
        verify(instrValRepo).findByRunIdAndDeviationBreachedTrue(5L);
    }
}
