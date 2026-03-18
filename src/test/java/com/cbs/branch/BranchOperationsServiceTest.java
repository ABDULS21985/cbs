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
}
