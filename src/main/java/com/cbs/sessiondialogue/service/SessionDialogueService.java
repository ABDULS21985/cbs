package com.cbs.sessiondialogue.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.sessiondialogue.entity.DialogueMessage;
import com.cbs.sessiondialogue.entity.DialogueSession;
import com.cbs.sessiondialogue.repository.DialogueMessageRepository;
import com.cbs.sessiondialogue.repository.DialogueSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SessionDialogueService {

    private final DialogueSessionRepository sessionRepository;
    private final DialogueMessageRepository messageRepository;

    @Transactional
    public DialogueSession startSession(DialogueSession session) {
        session.setSessionCode("DS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        session.setStatus("ACTIVE");
        session.setMessagesCount(0);
        return sessionRepository.save(session);
    }

    @Transactional
    public DialogueMessage addMessage(String sessionCode, DialogueMessage message) {
        DialogueSession session = getByCode(sessionCode);
        message.setMessageRef("DM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        message.setSessionId(session.getId());
        session.setMessagesCount(session.getMessagesCount() + 1);
        sessionRepository.save(session);
        return messageRepository.save(message);
    }

    @Transactional
    public DialogueSession escalateToHuman(String sessionCode, String agentId) {
        DialogueSession session = getByCode(sessionCode);
        session.setEscalatedToHuman(true);
        session.setAgentId(agentId);
        session.setStatus("ESCALATED");
        session.setResolutionStatus("ESCALATED");
        return sessionRepository.save(session);
    }

    @Transactional
    public DialogueSession endSession(String sessionCode, String resolutionStatus) {
        DialogueSession session = getByCode(sessionCode);
        session.setStatus("COMPLETED");
        session.setResolutionStatus(resolutionStatus);
        session.setEndedAt(Instant.now());
        return sessionRepository.save(session);
    }

    public List<DialogueSession> getCustomerSessions(Long customerId) {
        return sessionRepository.findByCustomerIdOrderByStartedAtDesc(customerId);
    }

    public List<DialogueSession> getActiveByAgent(String agentId) {
        return sessionRepository.findByAgentIdAndStatusOrderByStartedAtDesc(agentId, "ACTIVE");
    }

    private DialogueSession getByCode(String code) {
        return sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("DialogueSession", "sessionCode", code));
    }
}
