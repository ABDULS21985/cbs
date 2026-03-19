package com.cbs.integration.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class Psd2Service {

    private final Psd2TppRegistrationRepository tppRepository;
    private final Psd2ScaSessionRepository scaRepository;

    private static final BigDecimal LOW_VALUE_THRESHOLD = new BigDecimal("30.00"); // EUR 30

    // ── TPP Registration ─────────────────────────────────────

    @Transactional
    public Psd2TppRegistration registerTpp(Psd2TppRegistration tpp) {
        tppRepository.findByTppId(tpp.getTppId()).ifPresent(t -> {
            throw new BusinessException("TPP already registered: " + tpp.getTppId());
        });
        tpp.setStatus("PENDING");
        tpp.setLastCertificateCheck(Instant.now());
        Psd2TppRegistration saved = tppRepository.save(tpp);
        log.info("PSD2 TPP registered: id={}, name={}, type={}", saved.getTppId(), saved.getTppName(), saved.getTppType());
        return saved;
    }

    @Transactional
    public Psd2TppRegistration activateTpp(String tppId) {
        Psd2TppRegistration tpp = tppRepository.findByTppId(tppId)
                .orElseThrow(() -> new ResourceNotFoundException("Psd2TppRegistration", "tppId", tppId));
        if (tpp.getEidasCertificate() == null || tpp.getEidasCertificate().isBlank()) {
            throw new BusinessException("Cannot activate TPP without eIDAS certificate");
        }
        tpp.setStatus("ACTIVE");
        tpp.setCertificateValid(true);
        tpp.setLastCertificateCheck(Instant.now());
        log.info("PSD2 TPP activated: id={}", tppId);
        return tppRepository.save(tpp);
    }

    @Transactional
    public Psd2TppRegistration suspendTpp(String tppId) {
        Psd2TppRegistration tpp = tppRepository.findByTppId(tppId)
                .orElseThrow(() -> new ResourceNotFoundException("Psd2TppRegistration", "tppId", tppId));
        tpp.setStatus("SUSPENDED");
        log.warn("PSD2 TPP suspended: id={}", tppId);
        return tppRepository.save(tpp);
    }

    public List<Psd2TppRegistration> getActiveTpps() { return tppRepository.findByStatusOrderByTppNameAsc("ACTIVE"); }
    public List<Psd2TppRegistration> getAllTpps() { return tppRepository.findAll(); }

    // ── SCA Session Management ───────────────────────────────

    @Transactional
    public Psd2ScaSession initiateSca(String tppId, Long customerId, String scaMethod,
                                       Long paymentId, String consentId, BigDecimal amount,
                                       String ipAddress, String userAgent) {
        // Verify TPP is active
        Psd2TppRegistration tpp = tppRepository.findByTppId(tppId)
                .orElseThrow(() -> new ResourceNotFoundException("Psd2TppRegistration", "tppId", tppId));
        if (!"ACTIVE".equals(tpp.getStatus())) {
            throw new BusinessException("TPP is not active: " + tpp.getStatus());
        }

        // Check SCA exemptions (PSD2 Article 10-18 RTS)
        String exemption = evaluateExemption(amount, paymentId);

        String sessionId = "SCA-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        Psd2ScaSession session = Psd2ScaSession.builder()
                .sessionId(sessionId).tppId(tppId).customerId(customerId)
                .scaMethod(scaMethod).paymentId(paymentId).consentId(consentId)
                .ipAddress(ipAddress).userAgent(userAgent)
                .expiresAt(Instant.now().plus(5, ChronoUnit.MINUTES))
                .build();

        if (exemption != null) {
            session.setExemptionType(exemption);
            session.setScaStatus("EXEMPTED");
            session.setFinalisedAt(Instant.now());
            log.info("SCA exempted: session={}, exemption={}, amount={}", sessionId, exemption, amount);
        } else {
            session.setScaStatus("AUTHENTICATION_REQUIRED");
            log.info("SCA initiated: session={}, method={}, tpp={}", sessionId, scaMethod, tppId);
        }

        return scaRepository.save(session);
    }

    @Transactional
    public Psd2ScaSession finaliseSca(String sessionId, boolean success) {
        Psd2ScaSession session = scaRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Psd2ScaSession", "sessionId", sessionId));

        if (session.isExpired()) {
            session.setScaStatus("FAILED");
            scaRepository.save(session);
            throw new BusinessException("SCA session expired");
        }

        if ("EXEMPTED".equals(session.getScaStatus())) {
            return session; // Already finalised via exemption
        }

        session.setScaStatus(success ? "FINALISED" : "FAILED");
        session.setFinalisedAt(Instant.now());
        log.info("SCA finalised: session={}, result={}", sessionId, session.getScaStatus());
        return scaRepository.save(session);
    }

    private String evaluateExemption(BigDecimal amount, Long paymentId) {
        // Low value: transactions under EUR 30 (or local equivalent)
        if (amount != null && amount.compareTo(LOW_VALUE_THRESHOLD) <= 0) return "LOW_VALUE";
        // In production: also check RECURRING, TRUSTED_BENEFICIARY, SECURE_CORPORATE, TRA
        return null;
    }

    public List<Psd2ScaSession> getCustomerSessions(Long customerId) {
        return scaRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }
}
