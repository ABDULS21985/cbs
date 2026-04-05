package com.cbs.channel.service;

import com.cbs.channel.entity.*;
import com.cbs.channel.repository.*;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Omnichannel Orchestration (Cap 52) — manages session continuity across all channels.
 */
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class OmnichannelService {

    private final ChannelSessionRepository sessionRepository;
    private final ChannelConfigRepository configRepository;
    private final CurrentActorProvider currentActorProvider;

    @Value("${cbs.channel.max-concurrent-sessions:5}")
    private int maxConcurrentSessions;

    @Transactional
    public ChannelSession createSession(String channel, Long customerId, String deviceId,
                                          String deviceType, String ipAddress, String userAgent) {
        ChannelConfig config = configRepository.findByChannel(channel).orElse(null);
        if (config != null && !Boolean.TRUE.equals(config.getIsEnabled())) {
            throw new BusinessException("Channel " + channel + " is currently disabled", "CHANNEL_DISABLED");
        }

        // Max concurrent sessions check
        long activeSessions = sessionRepository.countByCustomerIdAndStatus(customerId, "ACTIVE");
        if (activeSessions >= maxConcurrentSessions) {
            throw new BusinessException("Customer " + customerId + " has reached the maximum concurrent session limit ("
                    + maxConcurrentSessions + ")", "MAX_SESSIONS_EXCEEDED");
        }

        String sessionId = "SES-" + UUID.randomUUID().toString().substring(0, 16).toUpperCase();
        int timeout = config != null ? config.getSessionTimeoutSecs() : 300;

        ChannelSession session = ChannelSession.builder()
                .sessionId(sessionId).customerId(customerId).channel(channel)
                .deviceId(deviceId).deviceType(deviceType).ipAddress(ipAddress).userAgent(userAgent)
                .timeoutSeconds(timeout).status("ACTIVE").build();

        ChannelSession saved = sessionRepository.save(session);
        log.info("AUDIT: Channel session created: id={}, channel={}, customer={}, actor={}",
                sessionId, channel, customerId, currentActorProvider.getCurrentActor());
        return saved;
    }

    /**
     * Cross-channel handoff: transfers session context from one channel to another.
     */
    @Transactional
    public ChannelSession handoffSession(String sourceSessionId, String targetChannel,
                                           String deviceId, String ipAddress) {
        ChannelSession source = sessionRepository.findBySessionId(sourceSessionId)
                .orElseThrow(() -> new ResourceNotFoundException("ChannelSession", "sessionId", sourceSessionId));

        // Session status validation: reject handoff if session is already ENDED or EXPIRED
        if ("ENDED".equals(source.getStatus()) || "EXPIRED".equals(source.getStatus())) {
            throw new BusinessException("Cannot hand off session " + sourceSessionId
                    + " with status " + source.getStatus(), "INVALID_SESSION_STATUS");
        }

        source.setStatus("HANDED_OFF");
        source.setEndedAt(Instant.now());
        sessionRepository.save(source);

        ChannelSession target = createSession(targetChannel, source.getCustomerId(), deviceId, null, ipAddress, null);
        target.setParentSessionId(sourceSessionId);
        target.setHandoffFromChannel(source.getChannel());
        target.setContextData(source.getContextData());
        sessionRepository.save(target);

        log.info("AUDIT: Session handoff: {} ({}) -> {} ({}), actor={}",
                sourceSessionId, source.getChannel(), target.getSessionId(), targetChannel, currentActorProvider.getCurrentActor());
        return target;
    }

    @Transactional
    public void touchSession(String sessionId) {
        sessionRepository.findBySessionId(sessionId).ifPresent(s -> {
            s.setLastActivityAt(Instant.now());
            sessionRepository.save(s);
        });
    }

    @Transactional
    public void endSession(String sessionId) {
        sessionRepository.findBySessionId(sessionId).ifPresent(s -> {
            s.setStatus("ENDED");
            s.setEndedAt(Instant.now());
            sessionRepository.save(s);
            log.info("AUDIT: Session ended: id={}, actor={}", sessionId, currentActorProvider.getCurrentActor());
        });
    }

    @Transactional
    public int cleanupExpiredSessions() {
        List<ChannelSession> expired = sessionRepository.findExpiredSessions();
        for (ChannelSession s : expired) {
            s.setStatus("EXPIRED");
            s.setEndedAt(Instant.now());
            sessionRepository.save(s);
        }
        if (!expired.isEmpty()) log.info("Cleaned up {} expired sessions", expired.size());
        return expired.size();
    }

    // Channel config
    @Transactional
    public ChannelConfig saveConfig(ChannelConfig config) { return configRepository.save(config); }
    public List<ChannelConfig> getAllConfigs() { return configRepository.findByIsActiveTrueOrderByChannelAsc(); }

    public List<ChannelSession> getAllActiveSessions() {
        return sessionRepository.findAll();
    }

    public Page<ChannelSession> getActiveSessionsPaged(int page, int size) {
        return sessionRepository.findAll(
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "startedAt")));
    }

    public Map<String, Long> getActiveSessionCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String ch : List.of("MOBILE","WEB","USSD","WHATSAPP","BRANCH","ATM","POS","AGENT","API","IVR")) {
            counts.put(ch, sessionRepository.countByChannelAndStatus(ch, "ACTIVE"));
        }
        return counts;
    }
}
