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
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private SettlementService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "penaltyRatePerDay", new java.math.BigDecimal("0.01"));
    }

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

    // ── Resubmit / Cancel / Escalate ────────────────────────────────────────────

    private SettlementInstruction buildFailedInstruction(String ref) {
        SettlementInstruction instr = new SettlementInstruction();
        instr.setId(10L);
        instr.setInstructionRef(ref);
        instr.setCustodyAccountId(100L);
        instr.setStatus("FAILED");
        instr.setFailReason("Counterparty account not found");
        instr.setFailedSince(LocalDate.now().minusDays(3));
        instr.setPenaltyAmount(new BigDecimal("0.03"));
        instr.setPriorityFlag(false);
        return instr;
    }

    @Test
    @DisplayName("Resubmit resets FAILED instruction to CREATED and clears fail fields")
    void resubmitResetsFailedToCreated() {
        SettlementInstruction instr = buildFailedInstruction("SI-RESUB");
        when(instructionRepo.findByInstructionRef("SI-RESUB")).thenReturn(Optional.of(instr));
        when(instructionRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        SettlementInstruction result = service.resubmitSettlement("SI-RESUB");

        assertThat(result.getStatus()).isEqualTo("CREATED");
        assertThat(result.getFailReason()).isNull();
        assertThat(result.getFailedSince()).isNull();
        assertThat(result.getPenaltyAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Resubmit rejects non-FAILED instruction")
    void resubmitRejectsNonFailed() {
        SettlementInstruction instr = new SettlementInstruction();
        instr.setInstructionRef("SI-OK");
        instr.setStatus("SETTLED");
        when(instructionRepo.findByInstructionRef("SI-OK")).thenReturn(Optional.of(instr));

        assertThatThrownBy(() -> service.resubmitSettlement("SI-OK"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only FAILED");
    }

    @Test
    @DisplayName("Cancel sets CANCELLED status with reason")
    void cancelSetsCancelledStatus() {
        SettlementInstruction instr = buildFailedInstruction("SI-CANCEL");
        when(instructionRepo.findByInstructionRef("SI-CANCEL")).thenReturn(Optional.of(instr));
        when(instructionRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        SettlementInstruction result = service.cancelSettlement("SI-CANCEL", "Duplicate instruction");

        assertThat(result.getStatus()).isEqualTo("CANCELLED");
        assertThat(result.getHoldReason()).isEqualTo("Duplicate instruction");
    }

    @Test
    @DisplayName("Cancel uses default reason when null")
    void cancelUsesDefaultReason() {
        SettlementInstruction instr = buildFailedInstruction("SI-CANCEL2");
        when(instructionRepo.findByInstructionRef("SI-CANCEL2")).thenReturn(Optional.of(instr));
        when(instructionRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        SettlementInstruction result = service.cancelSettlement("SI-CANCEL2", null);

        assertThat(result.getStatus()).isEqualTo("CANCELLED");
        assertThat(result.getHoldReason()).isEqualTo("Cancelled by operations");
    }

    @Test
    @DisplayName("Escalate sets priority flag and hold reason")
    void escalateSetsPriorityFlag() {
        SettlementInstruction instr = buildFailedInstruction("SI-ESC");
        when(instructionRepo.findByInstructionRef("SI-ESC")).thenReturn(Optional.of(instr));
        when(instructionRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        SettlementInstruction result = service.escalateSettlement("SI-ESC");

        assertThat(result.getPriorityFlag()).isTrue();
        assertThat(result.getHoldReason()).contains("ESCALATED");
        assertThat(result.getStatus()).isEqualTo("FAILED"); // status stays FAILED, just flagged
    }

    @Test
    @DisplayName("Escalate rejects non-FAILED instruction")
    void escalateRejectsNonFailed() {
        SettlementInstruction instr = new SettlementInstruction();
        instr.setInstructionRef("SI-OK2");
        instr.setStatus("SETTLING");
        when(instructionRepo.findByInstructionRef("SI-OK2")).thenReturn(Optional.of(instr));

        assertThatThrownBy(() -> service.escalateSettlement("SI-OK2"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only FAILED");
    }
}
