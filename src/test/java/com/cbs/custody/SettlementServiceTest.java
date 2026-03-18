package com.cbs.custody;

import com.cbs.common.exception.BusinessException;
import com.cbs.custody.entity.*;
import com.cbs.custody.repository.*;
import com.cbs.custody.service.*;
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
class SettlementServiceTest {

    @Mock private SettlementInstructionRepository instructionRepo;
    @Mock private SettlementBatchRepository batchRepo;
    @InjectMocks private SettlementService service;

    @Test
    @DisplayName("Matching sets MATCHED status and timestamp on both instructions")
    void matchingSetsMatchedStatusOnBoth() {
        SettlementInstruction instrA = new SettlementInstruction();
        instrA.setId(1L);
        instrA.setInstructionRef("SI-A");
        instrA.setCustodyAccountId(100L);
        instrA.setStatus("CREATED");
        instrA.setMatchStatus("UNMATCHED");

        SettlementInstruction instrB = new SettlementInstruction();
        instrB.setId(2L);
        instrB.setInstructionRef("SI-B");
        instrB.setCustodyAccountId(200L);
        instrB.setStatus("CREATED");
        instrB.setMatchStatus("UNMATCHED");

        when(instructionRepo.findByInstructionRef("SI-A")).thenReturn(Optional.of(instrA));
        when(instructionRepo.findByInstructionRef("SI-B")).thenReturn(Optional.of(instrB));
        when(instructionRepo.save(any(SettlementInstruction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        List<SettlementInstruction> result = service.matchInstruction("SI-A", "SI-B");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getMatchStatus()).isEqualTo("MATCHED");
        assertThat(result.get(0).getMatchedAt()).isNotNull();
        assertThat(result.get(1).getMatchStatus()).isEqualTo("MATCHED");
        assertThat(result.get(1).getMatchedAt()).isNotNull();
    }

    @Test
    @DisplayName("Penalty accrual calculates correctly per fail day")
    void penaltyAccrualCalculatesPerFailDay() {
        SettlementInstruction instruction = new SettlementInstruction();
        instruction.setId(1L);
        instruction.setInstructionRef("SI-TEST");
        instruction.setCustodyAccountId(100L);
        instruction.setStatus("FAILED");
        instruction.setFailedSince(LocalDate.now().minusDays(5));
        instruction.setPenaltyAmount(BigDecimal.ZERO);

        when(instructionRepo.findByInstructionRef("SI-TEST")).thenReturn(Optional.of(instruction));
        when(instructionRepo.save(any(SettlementInstruction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SettlementInstruction result = service.calculatePenalty("SI-TEST");

        assertThat(result.getPenaltyAmount()).isEqualByComparingTo(new BigDecimal("0.05"));
    }
}
