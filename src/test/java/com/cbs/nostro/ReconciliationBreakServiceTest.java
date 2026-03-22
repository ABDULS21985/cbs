package com.cbs.nostro;

import com.cbs.nostro.dto.BreakDto;
import com.cbs.nostro.dto.BreakResolveRequest;
import com.cbs.nostro.dto.BreakTimelineDto;
import com.cbs.nostro.dto.ComplianceCheckDto;
import com.cbs.nostro.dto.ComplianceScoreDto;
import com.cbs.nostro.entity.BreakTimelineEntry;
import com.cbs.nostro.entity.ReconciliationBreak;
import com.cbs.nostro.repository.BreakTimelineEntryRepository;
import com.cbs.nostro.repository.ReconciliationBreakRepository;
import com.cbs.nostro.service.ReconciliationBreakService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationBreakServiceTest {

    @Mock private ReconciliationBreakRepository breakRepository;
    @Mock private BreakTimelineEntryRepository timelineRepository;

    @InjectMocks private ReconciliationBreakService breakService;

    private ReconciliationBreak sampleBreak;

    @BeforeEach
    void setUp() {
        sampleBreak = ReconciliationBreak.builder()
                .id(1L)
                .positionId(100L)
                .reconItemId(200L)
                .accountNumber("1000000001")
                .bankName("JPMorgan Chase")
                .currency("USD")
                .amount(new BigDecimal("5000.00"))
                .direction("D")
                .detectedDate(LocalDate.now().minusDays(3))
                .assignedTo("treasury_ops")
                .status("OPEN")
                .escalationLevel("OFFICER")
                .build();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GET BREAKS
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("getBreaks")
    class GetBreaks {

        @Test
        @DisplayName("Should return all breaks when no filters")
        void returnsAllBreaks() {
            when(breakRepository.findByFilters(null, null, null))
                    .thenReturn(List.of(sampleBreak));

            List<BreakDto> result = breakService.getBreaks(null, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getAccountNumber()).isEqualTo("1000000001");
            assertThat(result.get(0).getBankName()).isEqualTo("JPMorgan Chase");
            assertThat(result.get(0).getAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));
            assertThat(result.get(0).getDirection()).isEqualTo("D");
            assertThat(result.get(0).getStatus()).isEqualTo("OPEN");
            assertThat(result.get(0).getEscalationLevel()).isEqualTo("OFFICER");
            assertThat(result.get(0).getAgingDays()).isEqualTo(3);
        }

        @Test
        @DisplayName("Should filter by status")
        void filtersByStatus() {
            when(breakRepository.findByFilters("ESCALATED", null, null))
                    .thenReturn(List.of());

            List<BreakDto> result = breakService.getBreaks("ESCALATED", null, null);
            assertThat(result).isEmpty();
            verify(breakRepository).findByFilters("ESCALATED", null, null);
        }

        @Test
        @DisplayName("Should filter by currency and assignedTo")
        void filtersByCurrencyAndAssignee() {
            when(breakRepository.findByFilters(null, "USD", "treasury_ops"))
                    .thenReturn(List.of(sampleBreak));

            List<BreakDto> result = breakService.getBreaks(null, "USD", "treasury_ops");
            assertThat(result).hasSize(1);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // RESOLVE BREAK
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("resolveBreak")
    class ResolveBreak {

        @Test
        @DisplayName("Should resolve break with WRITE_OFF type")
        void resolvesWithWriteOff() {
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.save(any())).thenReturn(sampleBreak);
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BreakResolveRequest request = BreakResolveRequest.builder()
                    .resolutionType("WRITE_OFF")
                    .reason("Below materiality threshold")
                    .build();

            breakService.resolveBreak(1L, request, "admin_user");

            assertThat(sampleBreak.getStatus()).isEqualTo("WRITTEN_OFF");
            assertThat(sampleBreak.getResolutionType()).isEqualTo("WRITE_OFF");
            assertThat(sampleBreak.getResolutionNotes()).isEqualTo("Below materiality threshold");
            assertThat(sampleBreak.getResolvedDate()).isEqualTo(LocalDate.now());
            assertThat(sampleBreak.getResolvedBy()).isEqualTo("admin_user");
            verify(breakRepository).save(sampleBreak);
        }

        @Test
        @DisplayName("Should resolve break with non-WRITE_OFF type as RESOLVED")
        void resolvesAsResolved() {
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.save(any())).thenReturn(sampleBreak);
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BreakResolveRequest request = BreakResolveRequest.builder()
                    .resolutionType("MANUAL_MATCH")
                    .reason("Matched with bank ref TXN-456")
                    .build();

            breakService.resolveBreak(1L, request, "officer");

            assertThat(sampleBreak.getStatus()).isEqualTo("RESOLVED");
            assertThat(sampleBreak.getResolutionType()).isEqualTo("MANUAL_MATCH");
        }

        @Test
        @DisplayName("Should create timeline entry on resolve")
        void createsTimelineEntry() {
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.save(any())).thenReturn(sampleBreak);
            ArgumentCaptor<BreakTimelineEntry> captor = ArgumentCaptor.forClass(BreakTimelineEntry.class);
            when(timelineRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            breakService.resolveBreak(1L, BreakResolveRequest.builder()
                    .resolutionType("CORRECTION").reason("Corrected entry").build(), "admin");

            BreakTimelineEntry entry = captor.getValue();
            assertThat(entry.getActor()).isEqualTo("admin");
            assertThat(entry.getAction()).contains("Resolved");
            assertThat(entry.getEntryType()).isEqualTo("RESOLVED");
        }

        @Test
        @DisplayName("Should throw EntityNotFoundException for unknown break")
        void throwsOnMissingBreak() {
            when(breakRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> breakService.resolveBreak(999L,
                    BreakResolveRequest.builder().resolutionType("CORRECTION").reason("test").build(), "user"))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ESCALATE BREAK
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("escalateBreak")
    class EscalateBreak {

        @Test
        @DisplayName("Should escalate from OFFICER to TEAM_LEAD")
        void escalatesOfficerToTeamLead() {
            sampleBreak.setEscalationLevel("OFFICER");
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.save(any())).thenReturn(sampleBreak);
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            breakService.escalateBreak(1L, "Unresolved after 48 hours", "supervisor");

            assertThat(sampleBreak.getEscalationLevel()).isEqualTo("TEAM_LEAD");
            assertThat(sampleBreak.getStatus()).isEqualTo("ESCALATED");
            assertThat(sampleBreak.getSlaDeadline()).isNotNull();
        }

        @Test
        @DisplayName("Should escalate from TEAM_LEAD to OPS_MANAGER")
        void escalatesTeamLeadToOpsManager() {
            sampleBreak.setEscalationLevel("TEAM_LEAD");
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.save(any())).thenReturn(sampleBreak);
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            breakService.escalateBreak(1L, "Still unresolved", "manager");

            assertThat(sampleBreak.getEscalationLevel()).isEqualTo("OPS_MANAGER");
        }

        @Test
        @DisplayName("Should not escalate beyond CFO")
        void doesNotEscalateBeyondCFO() {
            sampleBreak.setEscalationLevel("CFO");
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.save(any())).thenReturn(sampleBreak);
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            breakService.escalateBreak(1L, "Maximum level", "board");

            assertThat(sampleBreak.getEscalationLevel()).isEqualTo("CFO");
        }

        @Test
        @DisplayName("Should create ESCALATED timeline entry")
        void createsEscalationTimeline() {
            sampleBreak.setEscalationLevel("OFFICER");
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.save(any())).thenReturn(sampleBreak);
            ArgumentCaptor<BreakTimelineEntry> captor = ArgumentCaptor.forClass(BreakTimelineEntry.class);
            when(timelineRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            breakService.escalateBreak(1L, "Escalating for review", "supervisor");

            BreakTimelineEntry entry = captor.getValue();
            assertThat(entry.getEntryType()).isEqualTo("ESCALATED");
            assertThat(entry.getAction()).contains("TEAM_LEAD");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ADD NOTE
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("addNote")
    class AddNote {

        @Test
        @DisplayName("Should add note to break timeline")
        void addsNote() {
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(timelineRepository.save(any())).thenAnswer(inv -> {
                BreakTimelineEntry e = inv.getArgument(0);
                e.setId(50L);
                return e;
            });

            BreakTimelineDto result = breakService.addNote(1L, "Investigating with bank", "officer");

            assertThat(result.getActor()).isEqualTo("officer");
            assertThat(result.getNotes()).isEqualTo("Investigating with bank");
            assertThat(result.getType()).isEqualTo("INFO");
        }

        @Test
        @DisplayName("Should throw for non-existent break")
        void throwsForMissingBreak() {
            when(breakRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> breakService.addNote(999L, "note", "user"))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // BULK OPERATIONS
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("bulkAssign")
    class BulkAssign {

        @Test
        @DisplayName("Should bulk assign breaks and create timeline entries")
        void bulkAssigns() {
            List<Long> ids = List.of(1L, 2L, 3L);
            when(breakRepository.bulkAssign(ids, "new_officer")).thenReturn(3);
            when(breakRepository.findById(anyLong())).thenReturn(Optional.of(sampleBreak));
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            int updated = breakService.bulkAssign(ids, "new_officer", "admin");

            assertThat(updated).isEqualTo(3);
            verify(breakRepository).bulkAssign(ids, "new_officer");
            verify(timelineRepository, times(3)).save(any());
        }
    }

    @Nested
    @DisplayName("bulkEscalate")
    class BulkEscalate {

        @Test
        @DisplayName("Should bulk escalate breaks")
        void bulkEscalates() {
            List<Long> ids = List.of(1L, 2L);
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            ReconciliationBreak break2 = ReconciliationBreak.builder()
                    .id(2L).accountNumber("2000000002").bankName("Citi").currency("EUR")
                    .amount(new BigDecimal("1000")).direction("C").detectedDate(LocalDate.now())
                    .status("OPEN").escalationLevel("OFFICER").build();
            when(breakRepository.findById(2L)).thenReturn(Optional.of(break2));
            when(breakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            int count = breakService.bulkEscalate(ids, "Bulk escalation", "admin");

            assertThat(count).isEqualTo(2);
        }

        @Test
        @DisplayName("Should skip missing breaks during bulk escalation")
        void skipsMissing() {
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            when(breakRepository.findById(999L)).thenReturn(Optional.empty());
            when(breakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(timelineRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            int count = breakService.bulkEscalate(List.of(1L, 999L), "test", "admin");

            assertThat(count).isEqualTo(1);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TIMELINE
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("getTimeline")
    class GetTimeline {

        @Test
        @DisplayName("Should return timeline events for a break")
        void returnsTimeline() {
            when(breakRepository.findById(1L)).thenReturn(Optional.of(sampleBreak));
            BreakTimelineEntry entry = BreakTimelineEntry.builder()
                    .id(10L).reconBreak(sampleBreak).timestamp(Instant.now())
                    .actor("officer").action("Created").notes("Initial detection")
                    .entryType("INFO").build();
            when(timelineRepository.findByReconBreakIdOrderByTimestampDesc(1L))
                    .thenReturn(List.of(entry));

            List<BreakTimelineDto> result = breakService.getTimeline(1L);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getActor()).isEqualTo("officer");
            assertThat(result.get(0).getAction()).isEqualTo("Created");
        }

        @Test
        @DisplayName("Should throw for non-existent break")
        void throwsForMissing() {
            when(breakRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> breakService.getTimeline(999L))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // COMPLIANCE
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Compliance")
    class Compliance {

        @Test
        @DisplayName("Should return 5 compliance checks")
        void returnsChecklist() {
            when(breakRepository.countByStatus("OPEN")).thenReturn(0L);
            when(breakRepository.countByStatus("ESCALATED")).thenReturn(0L);
            when(breakRepository.count()).thenReturn(5L);

            List<ComplianceCheckDto> result = breakService.getComplianceChecklist();

            assertThat(result).hasSize(5);
            assertThat(result.get(0).getId()).isEqualTo("CBN-RECON-001");
            assertThat(result.get(0).isMet()).isTrue(); // no open breaks
            assertThat(result.get(1).isMet()).isTrue(); // no escalated breaks
        }

        @Test
        @DisplayName("Should mark daily recon as non-compliant when open breaks exist")
        void marksNonCompliant() {
            when(breakRepository.countByStatus("OPEN")).thenReturn(3L);
            when(breakRepository.countByStatus("ESCALATED")).thenReturn(1L);
            when(breakRepository.count()).thenReturn(10L);

            List<ComplianceCheckDto> result = breakService.getComplianceChecklist();

            assertThat(result.get(0).isMet()).isFalse(); // open breaks exist
            assertThat(result.get(1).isMet()).isFalse(); // escalated breaks exist
        }

        @Test
        @DisplayName("Should return 12-month compliance score trend")
        void returnsScoreTrend() {
            List<ComplianceScoreDto> result = breakService.getComplianceScoreTrend();

            assertThat(result).hasSize(12);
            result.forEach(score -> {
                assertThat(score.getScore()).isBetween(85.0, 100.0);
                assertThat(score.getTarget()).isEqualTo(95.0);
                assertThat(score.getMonth()).matches("\\d{4}-\\d{2}");
            });
        }
    }
}
