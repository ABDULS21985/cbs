package com.cbs.programtrading;

import com.cbs.common.exception.BusinessException;
import com.cbs.programtrading.entity.ProgramExecution;
import com.cbs.programtrading.entity.TradingStrategy;
import com.cbs.programtrading.repository.ProgramExecutionRepository;
import com.cbs.programtrading.repository.TradingStrategyRepository;
import com.cbs.programtrading.service.ProgramTradingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgramTradingServiceTest {

    @Mock
    private TradingStrategyRepository strategyRepository;

    @Mock
    private ProgramExecutionRepository executionRepository;

    @InjectMocks
    private ProgramTradingService service;

    @Test
    @DisplayName("Launch rejects non-APPROVED strategy")
    void launchRejectsNonApprovedStrategy() {
        TradingStrategy strategy = new TradingStrategy();
        strategy.setId(1L);
        strategy.setStrategyCode("TS-TEST00001");
        strategy.setStatus("DRAFT");

        when(strategyRepository.findByStrategyCode("TS-TEST00001")).thenReturn(Optional.of(strategy));

        ProgramExecution execution = new ProgramExecution();

        assertThatThrownBy(() -> service.launchExecution("TS-TEST00001", execution))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must be APPROVED or ACTIVE");
    }

    @Test
    @DisplayName("Pause sets PAUSED status")
    void pauseSetsPausedStatus() {
        ProgramExecution execution = new ProgramExecution();
        execution.setId(1L);
        execution.setExecutionRef("PE-TEST00001");
        execution.setStatus("EXECUTING");

        when(executionRepository.findByExecutionRef("PE-TEST00001")).thenReturn(Optional.of(execution));
        when(executionRepository.save(any(ProgramExecution.class))).thenAnswer(i -> i.getArgument(0));

        ProgramExecution result = service.pauseExecution("PE-TEST00001");

        assertThat(result.getStatus()).isEqualTo("PAUSED");
    }
}
