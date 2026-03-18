package com.cbs.sessiondialogue;

import com.cbs.sessiondialogue.entity.DialogueMessage;
import com.cbs.sessiondialogue.entity.DialogueSession;
import com.cbs.sessiondialogue.repository.DialogueMessageRepository;
import com.cbs.sessiondialogue.repository.DialogueSessionRepository;
import com.cbs.sessiondialogue.service.SessionDialogueService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionDialogueServiceTest {

    @Mock
    private DialogueSessionRepository sessionRepository;

    @Mock
    private DialogueMessageRepository messageRepository;

    @InjectMocks
    private SessionDialogueService service;

    @Test
    @DisplayName("Escalation sets agent ID and ESCALATED status")
    void escalationSetsAgentAndStatus() {
        DialogueSession session = new DialogueSession();
        session.setId(1L);
        session.setSessionCode("DS-TEST00001");
        session.setStatus("ACTIVE");
        session.setEscalatedToHuman(false);

        when(sessionRepository.findBySessionCode("DS-TEST00001")).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(DialogueSession.class))).thenAnswer(i -> i.getArgument(0));

        DialogueSession result = service.escalateToHuman("DS-TEST00001", "AGENT-007");

        assertThat(result.getStatus()).isEqualTo("ESCALATED");
        assertThat(result.getEscalatedToHuman()).isTrue();
        assertThat(result.getAgentId()).isEqualTo("AGENT-007");
        assertThat(result.getResolutionStatus()).isEqualTo("ESCALATED");
    }

    @Test
    @DisplayName("Adding a message increments session message count")
    void addMessageIncrementsCount() {
        DialogueSession session = new DialogueSession();
        session.setId(1L);
        session.setSessionCode("DS-TEST00002");
        session.setStatus("ACTIVE");
        session.setMessagesCount(3);

        DialogueMessage message = new DialogueMessage();
        message.setSenderType("CUSTOMER");
        message.setContent("Hello, I need help");

        when(sessionRepository.findBySessionCode("DS-TEST00002")).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(DialogueSession.class))).thenAnswer(i -> i.getArgument(0));
        when(messageRepository.save(any(DialogueMessage.class))).thenAnswer(i -> {
            DialogueMessage m = i.getArgument(0);
            m.setId(1L);
            return m;
        });

        DialogueMessage result = service.addMessage("DS-TEST00002", message);

        assertThat(session.getMessagesCount()).isEqualTo(4);
        assertThat(result.getMessageRef()).startsWith("DM-");
        assertThat(result.getSessionId()).isEqualTo(1L);
    }
}
