package com.cbs.channel.service;

import com.cbs.channel.entity.*;
import com.cbs.channel.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Omnichannel Orchestration (Cap 52) — manages session continuity across all channels.
 * Also provides channel configuration for:
 * - Cap 53 (Mobile Banking SDK): channel=MOBILE with feature flags, limits, biometric config
 * - Cap 54 (Internet Banking Portal): channel=WEB with maker-checker, bulk upload config
 * - Cap 56 (Conversational Banking): channel=WHATSAPP/IVR with NLP service code mapping
 */
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class OmnichannelService {

    private final ChannelSessionRepository sessionRepository;
    private final ChannelConfigRepository configRepository;

    @Transactional
    public ChannelSession createSession(String channel, Long customerId, String deviceId,
                                          String deviceType, String ipAddress, String userAgent) {
        ChannelConfig config = configRepository.findByChannel(channel).orElse(null);
        if (config != null && !Boolean.TRUE.equals(config.getIsEnabled())) {
            throw new BusinessException("Channel " + channel + " is currently disabled", "CHANNEL_DISABLED");
        }

        String sessionId = "SES-" + UUID.randomUUID().toString().substring(0, 16).toUpperCase();
        int timeout = config != null ? config.getSessionTimeoutSecs() : 300;

        ChannelSession session = ChannelSession.builder()
                .sessionId(sessionId).customerId(customerId).channel(channel)
                .deviceId(deviceId).deviceType(deviceType).ipAddress(ipAddress).userAgent(userAgent)
                .timeoutSeconds(timeout).status("ACTIVE").build();

        ChannelSession saved = sessionRepository.save(session);
        log.info("Channel session created: id={}, channel={}, customer={}", sessionId, channel, customerId);
        return saved;
    }

    /**
     * Cross-channel handoff: transfers session context from one channel to another.
     * E.g., customer starts on USSD, hands off to MOBILE to complete with biometrics.
     */
    @Transactional
    public ChannelSession handoffSession(String sourceSessionId, String targetChannel,
                                           String deviceId, String ipAddress) {
        ChannelSession source = sessionRepository.findBySessionId(sourceSessionId)
                .orElseThrow(() -> new ResourceNotFoundException("ChannelSession", "sessionId", sourceSessionId));

        source.setStatus("HANDED_OFF");
        source.setEndedAt(Instant.now());
        sessionRepository.save(source);

        ChannelSession target = createSession(targetChannel, source.getCustomerId(), deviceId, null, ipAddress, null);
        target.setParentSessionId(sourceSessionId);
        target.setHandoffFromChannel(source.getChannel());
        target.setContextData(source.getContextData()); // Carry forward context
        sessionRepository.save(target);

        log.info("Session handoff: {} ({}) → {} ({})", sourceSessionId, source.getChannel(), target.getSessionId(), targetChannel);
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

    public Map<String, Long> getActiveSessionCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String ch : List.of("MOBILE","WEB","USSD","WHATSAPP","BRANCH","ATM","POS","AGENT","API","IVR")) {
            counts.put(ch, sessionRepository.countByChannelAndStatus(ch, "ACTIVE"));
        }
        return counts;
    }
}
