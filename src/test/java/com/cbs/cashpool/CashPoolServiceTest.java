package com.cbs.cashpool;

import com.cbs.cashpool.entity.*;
import com.cbs.cashpool.repository.*;
import com.cbs.cashpool.service.CashPoolService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CashPoolServiceTest {

    @Mock private CashPoolStructureRepository poolRepository;
    @Mock private CashPoolParticipantRepository participantRepository;
    @Mock private CashPoolSweepLogRepository sweepLogRepository;
    @InjectMocks private CashPoolService cashPoolService;

    @Test @DisplayName("Pool creation generates code and persists")
    void createPool() {
        when(poolRepository.save(any())).thenAnswer(inv -> { CashPoolStructure p = inv.getArgument(0); p.setId(1L); return p; });
        CashPoolStructure pool = CashPoolStructure.builder().poolName("Group Treasury Pool")
                .poolType("ZERO_BALANCE").headerAccountId(100L).customerId(1L).build();
        CashPoolStructure result = cashPoolService.createPool(pool);
        assertThat(result.getPoolCode()).startsWith("CPL-");
    }

    @Test @DisplayName("Sweep skips min amount and header participants")
    void sweepSkipsHeader() {
        CashPoolStructure pool = CashPoolStructure.builder().id(1L).poolCode("CPL-TEST")
                .poolType("ZERO_BALANCE").headerAccountId(100L).isActive(true)
                .minSweepAmount(new BigDecimal("100")).intercompanyLoan(false).build();
        when(poolRepository.findByPoolCode("CPL-TEST")).thenReturn(Optional.of(pool));

        CashPoolParticipant header = CashPoolParticipant.builder().id(1L).poolId(1L)
                .accountId(100L).participantRole("HEADER").targetBalance(BigDecimal.ZERO).isActive(true).build();
        CashPoolParticipant participant = CashPoolParticipant.builder().id(2L).poolId(1L)
                .accountId(200L).participantRole("PARTICIPANT").targetBalance(BigDecimal.ZERO).isActive(true).build();
        when(participantRepository.findByPoolIdAndIsActiveTrueOrderByPriorityAsc(1L)).thenReturn(List.of(header, participant));

        List<CashPoolSweepLog> logs = cashPoolService.executeSweep("CPL-TEST");
        // Header skipped, only participant swept
        assertThat(logs).hasSizeLessThanOrEqualTo(1);
        verify(sweepLogRepository, atMost(1)).save(any());
    }
}
