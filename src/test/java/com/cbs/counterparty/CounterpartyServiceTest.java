package com.cbs.counterparty;

import com.cbs.common.exception.BusinessException;
import com.cbs.counterparty.entity.Counterparty;
import com.cbs.counterparty.repository.CounterpartyRepository;
import com.cbs.counterparty.service.CounterpartyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CounterpartyServiceTest {

    @Mock private CounterpartyRepository counterpartyRepository;
    @InjectMocks private CounterpartyService service;

    @Test @DisplayName("Creation calculates available limit = total - current")
    void createWithLimit() {
        when(counterpartyRepository.save(any())).thenAnswer(inv -> {
            Counterparty cp = inv.getArgument(0);
            cp.setId(1L);
            return cp;
        });
        Counterparty cp = Counterparty.builder()
                .counterpartyName("Bank A").counterpartyType("BANK").country("US")
                .totalExposureLimit(new BigDecimal("50000000"))
                .currentExposure(new BigDecimal("10000000")).build();
        Counterparty result = service.create(cp);
        assertThat(result.getAvailableLimit()).isEqualByComparingTo(new BigDecimal("40000000"));
        assertThat(result.getCounterpartyCode()).startsWith("CP-");
    }

    @Test @DisplayName("Cannot verify KYC for PROHIBITED counterparty")
    void prohibitedKyc() {
        Counterparty cp = new Counterparty();
        cp.setId(1L);
        cp.setCounterpartyCode("CP-BAD");
        cp.setRiskCategory("PROHIBITED");
        when(counterpartyRepository.findByCounterpartyCode("CP-BAD")).thenReturn(Optional.of(cp));
        assertThatThrownBy(() -> service.verifyKyc("CP-BAD"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("PROHIBITED");
    }

    @Test @DisplayName("Exposure update recalculates available limit")
    void exposureUpdate() {
        Counterparty cp = new Counterparty();
        cp.setId(1L);
        cp.setCounterpartyCode("CP-EXP");
        cp.setTotalExposureLimit(new BigDecimal("50000000"));
        cp.setCurrentExposure(BigDecimal.ZERO);
        when(counterpartyRepository.findByCounterpartyCode("CP-EXP")).thenReturn(Optional.of(cp));
        when(counterpartyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        Counterparty result = service.updateExposure("CP-EXP", new BigDecimal("35000000"));
        assertThat(result.getAvailableLimit()).isEqualByComparingTo(new BigDecimal("15000000"));
    }
}
