package com.cbs.statements;

import com.cbs.statements.entity.StatementSubscription;
import com.cbs.statements.repository.StatementSubscriptionRepository;
import com.cbs.statements.scheduler.StatementSubscriptionScheduler;
import com.cbs.statements.service.StatementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StatementSubscriptionSchedulerTest {

    @Mock private StatementSubscriptionRepository subscriptionRepository;
    @Mock private StatementService statementService;
    @InjectMocks private StatementSubscriptionScheduler scheduler;

    private StatementSubscription buildSubscription(Long id, String frequency, String delivery, String email) {
        return StatementSubscription.builder()
                .id(id)
                .accountId(100L)
                .frequency(frequency)
                .delivery(delivery)
                .format("PDF")
                .email(email)
                .active(true)
                .nextDelivery(LocalDate.now())
                .build();
    }

    @Test
    @DisplayName("processSubscriptions skips when no due subscriptions")
    void noOpWhenNoDueSubscriptions() {
        when(subscriptionRepository.findByActiveTrueAndNextDeliveryLessThanEqual(any(LocalDate.class)))
                .thenReturn(List.of());

        scheduler.processSubscriptions();

        verifyNoInteractions(statementService);
        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("processSubscriptions dispatches email for EMAIL delivery subscriptions")
    void emailDeliveryDispatchesEmail() {
        StatementSubscription sub = buildSubscription(1L, "MONTHLY", "EMAIL", "test@example.com");
        when(subscriptionRepository.findByActiveTrueAndNextDeliveryLessThanEqual(any(LocalDate.class)))
                .thenReturn(List.of(sub));
        when(statementService.emailStatement(eq(100L), any(LocalDate.class), any(LocalDate.class), eq("test@example.com")))
                .thenReturn(Map.of("status", "SENT"));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        scheduler.processSubscriptions();

        verify(statementService).emailStatement(eq(100L), any(LocalDate.class), any(LocalDate.class), eq("test@example.com"));
        verify(subscriptionRepository).save(sub);
        // Next delivery should be advanced by 1 month
    }

    @Test
    @DisplayName("processSubscriptions generates statement for PORTAL delivery")
    void portalDeliveryGeneratesStatement() {
        StatementSubscription sub = buildSubscription(2L, "WEEKLY", "PORTAL", null);
        when(subscriptionRepository.findByActiveTrueAndNextDeliveryLessThanEqual(any(LocalDate.class)))
                .thenReturn(List.of(sub));
        when(statementService.generateStatement(eq(100L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Map.of("statementId", "STMT-100"));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        scheduler.processSubscriptions();

        verify(statementService).generateStatement(eq(100L), any(LocalDate.class), any(LocalDate.class));
        verify(statementService, never()).emailStatement(anyLong(), any(), any(), any());
        verify(subscriptionRepository).save(sub);
    }

    @Test
    @DisplayName("processSubscriptions handles multiple subscriptions and continues on failure")
    void continuesOnFailure() {
        StatementSubscription sub1 = buildSubscription(1L, "MONTHLY", "EMAIL", "a@example.com");
        StatementSubscription sub2 = buildSubscription(2L, "WEEKLY", "EMAIL", "b@example.com");

        when(subscriptionRepository.findByActiveTrueAndNextDeliveryLessThanEqual(any(LocalDate.class)))
                .thenReturn(List.of(sub1, sub2));
        // First subscription fails
        when(statementService.emailStatement(eq(100L), any(), any(), eq("a@example.com")))
                .thenThrow(new RuntimeException("Account not found"));
        // Second subscription succeeds
        when(statementService.emailStatement(eq(100L), any(), any(), eq("b@example.com")))
                .thenReturn(Map.of("status", "SENT"));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        scheduler.processSubscriptions();

        // Both should be attempted
        verify(statementService).emailStatement(eq(100L), any(), any(), eq("a@example.com"));
        verify(statementService).emailStatement(eq(100L), any(), any(), eq("b@example.com"));
        // Only the successful one gets saved with updated nextDelivery
        verify(subscriptionRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("WEEKLY subscription uses 1-week period")
    void weeklySubscriptionUsesWeekPeriod() {
        StatementSubscription sub = buildSubscription(1L, "WEEKLY", "PORTAL", null);
        when(subscriptionRepository.findByActiveTrueAndNextDeliveryLessThanEqual(any(LocalDate.class)))
                .thenReturn(List.of(sub));
        when(statementService.generateStatement(eq(100L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Map.of());
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        scheduler.processSubscriptions();

        LocalDate today = LocalDate.now();
        verify(statementService).generateStatement(100L, today.minusWeeks(1), today);
    }

    @Test
    @DisplayName("QUARTERLY subscription uses 3-month period")
    void quarterlySubscriptionUses3MonthPeriod() {
        StatementSubscription sub = buildSubscription(1L, "QUARTERLY", "PORTAL", null);
        when(subscriptionRepository.findByActiveTrueAndNextDeliveryLessThanEqual(any(LocalDate.class)))
                .thenReturn(List.of(sub));
        when(statementService.generateStatement(eq(100L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Map.of());
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        scheduler.processSubscriptions();

        LocalDate today = LocalDate.now();
        verify(statementService).generateStatement(100L, today.minusMonths(3), today);
    }
}
