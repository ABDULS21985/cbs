package com.cbs.quantmodel;

import com.cbs.common.exception.BusinessException;
import com.cbs.quantmodel.entity.ModelBacktest;
import com.cbs.quantmodel.entity.QuantModel;
import com.cbs.quantmodel.repository.ModelBacktestRepository;
import com.cbs.quantmodel.repository.QuantModelRepository;
import com.cbs.quantmodel.service.QuantModelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuantModelServiceTest {

    @Mock
    private QuantModelRepository modelRepository;

    @Mock
    private ModelBacktestRepository backtestRepository;

    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks
    private QuantModelService service;

    @Test
    @DisplayName("Promote rejects non-APPROVED models")
    void promoteRejectsNonApprovedModels() {
        QuantModel model = new QuantModel();
        model.setId(1L);
        model.setModelCode("QM-TEST00001");
        model.setStatus("DEVELOPMENT");

        when(modelRepository.findByModelCode("QM-TEST00001")).thenReturn(Optional.of(model));

        assertThatThrownBy(() -> service.promote("QM-TEST00001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must be APPROVED");
    }

    @Test
    @DisplayName("Backtest breachPct auto-calculated from breachCount / sampleSize × 100")
    void backtestBreachPctAutoCalculated() {
        ModelBacktest backtest = new ModelBacktest();
        backtest.setModelId(1L);
        backtest.setBacktestType("OUT_OF_SAMPLE");
        backtest.setSampleSize(1000);
        backtest.setBreachCount(25);
        backtest.setResultStatus("PASS");

        when(backtestRepository.save(any(ModelBacktest.class))).thenAnswer(i -> i.getArgument(0));

        ModelBacktest result = service.recordBacktest(backtest);

        // 25 / 1000 × 100 = 2.50
        assertThat(result.getBreachPct()).isEqualByComparingTo(new BigDecimal("2.50"));
        assertThat(result.getBacktestRef()).startsWith("BT-");
    }
}
