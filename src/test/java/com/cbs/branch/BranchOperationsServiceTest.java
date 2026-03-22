package com.cbs.branch;

import com.cbs.common.exception.BusinessException;
import com.cbs.branch.entity.*;
import com.cbs.branch.repository.*;
import com.cbs.branch.service.*;
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
class BranchOperationsServiceTest {

    @Mock private BranchFacilityRepository facilityRepo;
    @Mock private BranchStaffScheduleRepository scheduleRepo;
    @Mock private BranchQueueTicketRepository ticketRepo;
    @Mock private BranchServicePlanRepository planRepo;
    @InjectMocks private BranchOperationsService service;

    @Test
    @DisplayName("Queue ticket wait time calculated as calledAt minus issuedAt")
    void queueTicketWaitTimeCalculated() {
        // Create a ticket with issuedAt 120 seconds ago
        BranchQueueTicket ticket = new BranchQueueTicket();
        ticket.setId(1L);
        ticket.setBranchId(1L);
        ticket.setTicketNumber("A001");
        ticket.setIssuedAt(Instant.now().minusSeconds(120));
        ticket.setStatus("WAITING");

        when(ticketRepo.findByBranchIdAndStatusOrderByIssuedAtAsc(1L, "WAITING"))
                .thenReturn(List.of(ticket));
        when(ticketRepo.save(any(BranchQueueTicket.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BranchQueueTicket result = service.callNextTicket(1L, "C1", "EMP1");

        assertThat(result.getStatus()).isEqualTo("CALLED");
        assertThat(result.getCalledAt()).isNotNull();

        // Now simulate completing the service
        BranchQueueTicket ticket2 = new BranchQueueTicket();
        ticket2.setId(1L);
        ticket2.setBranchId(1L);
        ticket2.setTicketNumber("A001");
        ticket2.setStatus("SERVING");
        ticket2.setIssuedAt(Instant.now().minusSeconds(120));
        ticket2.setCalledAt(Instant.now().minusSeconds(60));
        ticket2.setServingStartedAt(Instant.now().minusSeconds(60));

        when(ticketRepo.findById(1L)).thenReturn(Optional.of(ticket2));
        when(ticketRepo.save(any(BranchQueueTicket.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BranchQueueTicket completed = service.completeService(1L);

        assertThat(completed.getWaitTimeSeconds()).isGreaterThan(0);
        assertThat(completed.getServiceTimeSeconds()).isGreaterThan(0);
    }

    @Test
    @DisplayName("Service plan achievement percentage updates correctly")
    void servicePlanActualsUpdate() {
        BranchServicePlan plan = new BranchServicePlan();
        plan.setId(1L);
        plan.setBranchId(10L);
        plan.setTargetTransactionVolume(100);
        plan.setTargetNewAccounts(50);
        plan.setActualTransactionVolume(0);
        plan.setActualNewAccounts(0);
        plan.setActualCrossSell(0);

        when(planRepo.findById(1L)).thenReturn(Optional.of(plan));
        when(planRepo.save(any(BranchServicePlan.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BranchServicePlan result = service.updateActuals(1L, 80, 40, 10);

        assertThat(result.getActualTransactionVolume()).isEqualTo(80);
        assertThat(result.getActualNewAccounts()).isEqualTo(40);
        assertThat(result.getActualCrossSell()).isEqualTo(10);
    }

    @Test
    @DisplayName("Should throw BusinessException when no waiting tickets for branch")
    void callNextTicket_NoWaiting() {
        when(ticketRepo.findByBranchIdAndStatusOrderByIssuedAtAsc(1L, "WAITING"))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.callNextTicket(1L, "C1", "EMP1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No waiting tickets");
    }

    @Test
    @DisplayName("Should mark ticket as NO_SHOW with completion time")
    void markNoShow_Success() {
        BranchQueueTicket ticket = new BranchQueueTicket();
        ticket.setId(1L);
        ticket.setStatus("CALLED");

        when(ticketRepo.findById(1L)).thenReturn(Optional.of(ticket));
        when(ticketRepo.save(any(BranchQueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        BranchQueueTicket result = service.markNoShow(1L);

        assertThat(result.getStatus()).isEqualTo("NO_SHOW");
        assertThat(result.getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should calculate branch stats with queue metrics")
    void getBranchStats_ReturnsMetrics() {
        BranchQueueTicket completed = new BranchQueueTicket();
        completed.setStatus("COMPLETED");
        completed.setWaitTimeSeconds(120);
        completed.setServiceTimeSeconds(300);

        when(ticketRepo.findByBranchIdAndIssuedAtBetween(eq(1L), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(completed));
        when(scheduleRepo.countByBranchIdAndScheduledDateAndShiftTypeNot(eq(1L), any(LocalDate.class), eq("OFF")))
                .thenReturn(5L);

        Map<String, Object> stats = service.getBranchStats(1L);

        assertThat(stats).containsEntry("customersServedToday", 1L);
        assertThat(stats).containsEntry("staffOnDuty", 5L);
        assertThat(stats).containsKey("avgWaitMinutes");
        assertThat(stats).containsKey("avgServiceMinutes");
        assertThat(stats).containsKey("transactionsToday");
    }

    @Test
    @DisplayName("Should return queue history for specific date")
    void getQueueHistory_ReturnsTicketsForDate() {
        BranchQueueTicket ticket = new BranchQueueTicket();
        ticket.setId(1L);
        ticket.setTicketNumber("A001");

        when(ticketRepo.findByBranchIdAndIssuedAtBetween(eq(1L), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(ticket));

        List<BranchQueueTicket> result = service.getQueueHistory(1L, "2026-03-22");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTicketNumber()).isEqualTo("A001");
    }

    @Test
    @DisplayName("Should return service plans filtered by branch")
    void getServicePlansByBranch_ReturnsFiltered() {
        BranchServicePlan plan = new BranchServicePlan();
        plan.setBranchId(1L);
        plan.setPlanPeriod("2026-Q1");

        when(planRepo.findByBranchId(1L)).thenReturn(List.of(plan));

        List<BranchServicePlan> result = service.getServicePlansByBranch(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPlanPeriod()).isEqualTo("2026-Q1");
    }

    @Test
    @DisplayName("Should generate branch rankings sorted by score descending")
    void getBranchRankings_SortedByScore() {
        BranchServicePlan plan1 = new BranchServicePlan();
        plan1.setBranchId(1L);
        plan1.setTargetTransactionVolume(100);
        plan1.setActualTransactionVolume(80);
        plan1.setPlanPeriod("2026-Q1");

        BranchServicePlan plan2 = new BranchServicePlan();
        plan2.setBranchId(2L);
        plan2.setTargetTransactionVolume(100);
        plan2.setActualTransactionVolume(95);
        plan2.setPlanPeriod("2026-Q1");

        when(planRepo.findAll()).thenReturn(List.of(plan1, plan2));

        List<Map<String, Object>> rankings = service.getBranchRankings();

        assertThat(rankings).hasSize(2);
        // plan2 has higher score (95%) so should be first
        assertThat(rankings.get(0).get("branchId")).isEqualTo(2L);
    }
}
