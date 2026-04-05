package com.cbs.digital.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.digital.entity.*;
import com.cbs.digital.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class InternetBankingService {

    private final InternetBankingSessionRepository sessionRepository;
    private final InternetBankingFeatureRepository featureRepository;

    @Transactional
    public InternetBankingSession login(Long customerId, String loginMethod, String deviceFingerprint,
                                         String ipAddress, String userAgent) {
        String sessionId = "IBS-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        InternetBankingSession session = InternetBankingSession.builder()
                .sessionId(sessionId).customerId(customerId).loginMethod(loginMethod)
                .deviceFingerprint(deviceFingerprint).ipAddress(ipAddress).userAgent(userAgent)
                .mfaCompleted(false).sessionStatus("ACTIVE").build();
        InternetBankingSession saved = sessionRepository.save(session);
        log.info("IB login: session={}, customer={}, method={}", sessionId, customerId, loginMethod);
        return saved;
    }

    @Transactional
    public InternetBankingSession completeMfa(String sessionId) {
        InternetBankingSession session = getActiveSession(sessionId);
        session.setMfaCompleted(true);
        session.setLastActivityAt(Instant.now());
        return sessionRepository.save(session);
    }

    @Transactional
    public InternetBankingSession touchSession(String sessionId) {
        InternetBankingSession session = getActiveSession(sessionId);
        if (session.isAbsoluteExpired()) {
            session.setSessionStatus("EXPIRED");
            sessionRepository.save(session);
            throw new BusinessException("Session expired (absolute timeout)");
        }
        if (session.isIdle()) {
            session.setSessionStatus("IDLE");
            sessionRepository.save(session);
            throw new BusinessException("Session idle — re-authentication required");
        }
        session.setLastActivityAt(Instant.now());
        return sessionRepository.save(session);
    }

    @Transactional
    public void logout(String sessionId) {
        InternetBankingSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("InternetBankingSession", "sessionId", sessionId));
        session.setSessionStatus("TERMINATED");
        session.setLogoutAt(Instant.now());
        sessionRepository.save(session);
        log.info("IB logout: session={}", sessionId);
    }

    public boolean canAccessFeature(String sessionId, String featureCode) {
        InternetBankingSession session = getActiveSession(sessionId);
        InternetBankingFeature feature = featureRepository.findByFeatureCode(featureCode)
                .orElseThrow(() -> new ResourceNotFoundException("InternetBankingFeature", "featureCode", featureCode));

        if (!feature.getIsEnabled()) return false;
        if (feature.getRequiresMfa() && !session.getMfaCompleted()) return false;
        return true;
    }

    public List<InternetBankingFeature> getAvailableFeatures(String sessionId) {
        InternetBankingSession session = getActiveSession(sessionId);
        List<InternetBankingFeature> all = featureRepository.findByIsEnabledTrueOrderByFeatureCategoryAscFeatureNameAsc();
        if (session.getMfaCompleted()) return all;
        return all.stream().filter(f -> !f.getRequiresMfa()).toList();
    }

    @Transactional
    public int expireIdleSessions() {
        // Use paginated query with a pre-filter on lastActivityAt to avoid loading all active sessions.
        // The idle timeout default is 15 minutes; use a conservative threshold to pre-filter at DB level.
        Instant idleThreshold = Instant.now().minusSeconds(15 * 60L);
        int expired = 0;
        int pageNumber = 0;
        final int batchSize = 500;
        org.springframework.data.domain.Page<InternetBankingSession> page;
        do {
            page = sessionRepository.findBySessionStatusAndLastActivityAtBefore(
                    "ACTIVE", idleThreshold,
                    org.springframework.data.domain.PageRequest.of(pageNumber, batchSize));
            for (InternetBankingSession s : page.getContent()) {
                if (s.isIdle() || s.isAbsoluteExpired()) {
                    s.setSessionStatus("EXPIRED");
                    sessionRepository.save(s);
                    expired++;
                }
            }
            pageNumber++;
        } while (page.hasNext());
        if (expired > 0) log.info("Expired {} idle/absolute-timeout sessions", expired);
        return expired;
    }

    private InternetBankingSession getActiveSession(String sessionId) {
        InternetBankingSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("InternetBankingSession", "sessionId", sessionId));
        if (!"ACTIVE".equals(session.getSessionStatus())) {
            throw new BusinessException("Session is not active: " + session.getSessionStatus());
        }
        return session;
    }
}
