package com.cbs.contactcenter;

import com.cbs.contactcenter.entity.*;
import com.cbs.contactcenter.repository.*;
import com.cbs.contactcenter.service.ContactCenterService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactCenterServiceTest {

    @Mock private ContactCenterRepository centerRepository;
    @Mock private ContactInteractionRepository interactionRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private ContactCenterService service;

    @Test @DisplayName("Interaction starts in QUEUED status with generated ID")
    void startInteraction() {
        when(interactionRepository.save(any())).thenAnswer(inv -> { ContactInteraction i = inv.getArgument(0); i.setId(1L); return i; });
        ContactInteraction i = ContactInteraction.builder().customerId(1L).channel("PHONE").direction("INBOUND").contactReason("Account inquiry").build();
        ContactInteraction result = service.startInteraction(i);
        assertThat(result.getInteractionId()).startsWith("INT-");
        assertThat(result.getStatus()).isEqualTo("QUEUED");
    }

    @Test @DisplayName("Agent assignment calculates wait time and sets ACTIVE")
    void assignAgent() {
        ContactInteraction i = ContactInteraction.builder().id(1L).interactionId("INT-TEST")
                .status("QUEUED").startedAt(java.time.Instant.now().minusSeconds(30)).build();
        when(interactionRepository.findByInteractionId("INT-TEST")).thenReturn(Optional.of(i));
        when(interactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ContactInteraction result = service.assignToAgent("INT-TEST", "AGENT-001");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getAgentId()).isEqualTo("AGENT-001");
        assertThat(result.getWaitTimeSec()).isGreaterThanOrEqualTo(29);
    }

    @Test @DisplayName("Completion records handle time, disposition, sentiment, FCR")
    void completeInteraction() {
        ContactInteraction i = ContactInteraction.builder().id(1L).interactionId("INT-DONE")
                .status("ACTIVE").startedAt(java.time.Instant.now().minusSeconds(180)).build();
        when(interactionRepository.findByInteractionId("INT-DONE")).thenReturn(Optional.of(i));
        when(interactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ContactInteraction result = service.completeInteraction("INT-DONE", "RESOLVED", "POSITIVE", "Issue resolved on first call", true);
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getFirstContactResolution()).isTrue();
        assertThat(result.getHandleTimeSec()).isGreaterThanOrEqualTo(179);
    }
}
