package com.cbs.sessiondialogue.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.sessiondialogue.entity.DialogueMessage;
import com.cbs.sessiondialogue.entity.DialogueSession;
import com.cbs.sessiondialogue.repository.DialogueMessageRepository;
import com.cbs.sessiondialogue.repository.DialogueSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public DialogueSession startSession(DialogueSession session) {
        // Validate required fields
        if (!StringUtils.hasText(session.getChannel())) {
            throw new BusinessException("Channel is required to start a session", "MISSING_CHANNEL");
        }
        if (session.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required to start a session", "MISSING_CUSTOMER_ID");
        }
        session.setSessionCode("DS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        session.setStatus("ACTIVE");
        session.setMessagesCount(0);
        session.setStartedAt(Instant.now());
        DialogueSession saved = sessionRepository.save(session);
        log.info("AUDIT: Session started: code={}, channel={}, customerId={}, actor={}",
                saved.getSessionCode(), saved.getChannel(), saved.getCustomerId(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public DialogueMessage addMessage(String sessionCode, DialogueMessage message) {
        DialogueSession session = getByCode(sessionCode);

        // Guard: only ACTIVE or ESCALATED sessions can receive messages
        if (!"ACTIVE".equals(session.getStatus()) && !"ESCALATED".equals(session.getStatus())) {
            throw new BusinessException(
                    "Cannot add message to session in status " + session.getStatus() + "; must be ACTIVE or ESCALATED",
                    "SESSION_NOT_ACTIVE");
        }

        if (!StringUtils.hasText(message.getContent())) {
            throw new BusinessException("Message content cannot be empty", "EMPTY_MESSAGE");
        }

        message.setMessageRef("DM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        message.setSessionId(session.getId());
        session.setMessagesCount(session.getMessagesCount() + 1);
        sessionRepository.save(session);
        DialogueMessage saved = messageRepository.save(message);
        log.info("AUDIT: Message added: sessionCode={}, messageRef={}, sender={}",
                sessionCode, saved.getMessageRef(), saved.getSenderType());
        return saved;
    }

    @Transactional
    public DialogueSession escalateToHuman(String sessionCode, String agentId) {
        DialogueSession session = getByCode(sessionCode);
        if (!"ACTIVE".equals(session.getStatus())) {
            throw new BusinessException("Only ACTIVE sessions can be escalated; current status: " + session.getStatus(),
                    "INVALID_SESSION_STATUS");
        }
        if (!StringUtils.hasText(agentId)) {
            throw new BusinessException("Agent ID is required for escalation", "MISSING_AGENT_ID");
        }
        session.setEscalatedToHuman(true);
        session.setAgentId(agentId);
        session.setStatus("ESCALATED");
        session.setResolutionStatus("ESCALATED");
        DialogueSession saved = sessionRepository.save(session);
        log.info("AUDIT: Session escalated: code={}, agentId={}, actor={}",
                sessionCode, agentId, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public DialogueSession endSession(String sessionCode, String resolutionStatus) {
        DialogueSession session = getByCode(sessionCode);

        // Prevent double-end
        if ("COMPLETED".equals(session.getStatus())) {
            throw new BusinessException("Session is already completed", "SESSION_ALREADY_ENDED");
        }

        session.setStatus("COMPLETED");
        session.setResolutionStatus(resolutionStatus);
        session.setEndedAt(Instant.now());

        // Calculate session duration for logging
        long durationSeconds = 0;
        if (session.getStartedAt() != null) {
            durationSeconds = Duration.between(session.getStartedAt(), session.getEndedAt()).getSeconds();
        }

        DialogueSession saved = sessionRepository.save(session);
        log.info("AUDIT: Session ended: code={}, resolution={}, durationSec={}, messages={}, actor={}",
                sessionCode, resolutionStatus, durationSeconds,
                session.getMessagesCount(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<DialogueSession> getCustomerSessions(Long customerId) {
        return sessionRepository.findByCustomerIdOrderByStartedAtDesc(customerId);
    }

    public List<DialogueSession> getActiveByAgent(String agentId) {
        return sessionRepository.findByAgentIdAndStatusOrderByStartedAtDesc(agentId, "ACTIVE");
    }

    public List<DialogueMessage> getMessagesBySessionCode(String sessionCode) {
        DialogueSession session = getByCode(sessionCode);
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
    }

    private DialogueSession getByCode(String code) {
        return sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("DialogueSession", "sessionCode", code));
    }
}
