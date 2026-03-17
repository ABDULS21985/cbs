package com.cbs.eventing;

import com.cbs.eventing.entity.*;
import com.cbs.eventing.repository.*;
import com.cbs.eventing.service.EventingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventingServiceTest {

    @Mock private DomainEventRepository eventRepository;
    @Mock private EventSubscriptionRepository subscriptionRepository;

    @InjectMocks private EventingService eventingService;

    @Test
    @DisplayName("Should publish event to outbox (unpublished)")
    void publishEvent() {
        when(eventRepository.getNextSequence()).thenReturn(1L);
        when(eventRepository.save(any())).thenAnswer(inv -> { DomainEvent e = inv.getArgument(0); e.setId(1L); return e; });

        DomainEvent result = eventingService.publishEvent("ACCOUNT_CREATED", "ACCOUNT", 100L,
                Map.of("accountNumber", "1000000001", "customerId", 1), null);

        assertThat(result.getEventType()).isEqualTo("ACCOUNT_CREATED");
        assertThat(result.getPublished()).isFalse(); // In outbox, not yet delivered
        assertThat(result.getTopic()).isEqualTo("cbs.account");
    }

    @Test
    @DisplayName("Outbox processor delivers to matching subscribers only")
    void processOutbox_MatchingOnly() {
        DomainEvent event = DomainEvent.builder().id(1L).eventId("EVT-ACC-001")
                .eventType("ACCOUNT_CREATED").aggregateType("ACCOUNT").aggregateId(100L)
                .payload(Map.of("test", true)).sequenceNumber(1L).published(false).build();

        EventSubscription matchingSub = EventSubscription.builder().id(1L)
                .subscriptionName("account-notifier").eventTypes(List.of("ACCOUNT_CREATED"))
                .deliveryType("LOG").isActive(true).failureCount(0).maxRetries(3).build();

        EventSubscription nonMatchingSub = EventSubscription.builder().id(2L)
                .subscriptionName("loan-processor").eventTypes(List.of("LOAN_DISBURSED"))
                .deliveryType("WEBHOOK").isActive(true).failureCount(0).maxRetries(3).build();

        when(eventRepository.findUnpublished()).thenReturn(List.of(event));
        when(subscriptionRepository.findByIsActiveTrueOrderBySubscriptionNameAsc()).thenReturn(List.of(matchingSub, nonMatchingSub));
        when(eventRepository.save(any())).thenReturn(event);

        int delivered = eventingService.processOutbox();

        assertThat(delivered).isEqualTo(1); // Only matching sub
        assertThat(event.getPublished()).isTrue();
    }

    @Test
    @DisplayName("Wildcard subscription matches all events")
    void wildcardSubscription() {
        EventSubscription wildcard = EventSubscription.builder().eventTypes(List.of("*")).build();
        assertThat(wildcard.matchesEventType("ACCOUNT_CREATED")).isTrue();
        assertThat(wildcard.matchesEventType("LOAN_DISBURSED")).isTrue();
    }
}
