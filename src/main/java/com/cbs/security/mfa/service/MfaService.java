package com.cbs.security.mfa.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.security.mfa.entity.*;
import com.cbs.security.mfa.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MfaService {

    private final MfaEnrollmentRepository enrollmentRepository;
    private final MfaChallengeRepository challengeRepository;

    private static final int OTP_LENGTH = 6;
    private static final int OTP_VALIDITY_MINUTES = 5;
    private static final int MAX_FAILURES = 5;
    private static final int LOCKOUT_MINUTES = 30;

    @Transactional
    public MfaEnrollment enroll(String userId, Long customerId, String mfaMethod,
                                  String phoneNumber, String emailAddress, String deviceId) {
        MfaEnrollment enrollment = MfaEnrollment.builder()
                .userId(userId).customerId(customerId).mfaMethod(mfaMethod)
                .phoneNumber(phoneNumber).emailAddress(emailAddress).deviceId(deviceId)
                .isPrimary(enrollmentRepository.findByUserIdAndIsActiveTrue(userId).isEmpty())
                .isVerified(false).build();

        if ("TOTP".equals(mfaMethod)) {
            enrollment.setSecretHash(generateTotpSecret());
        }

        MfaEnrollment saved = enrollmentRepository.save(enrollment);
        log.info("MFA enrolled: user={}, method={}", userId, mfaMethod);
        return saved;
    }

    /**
     * Initiates an MFA challenge — generates and returns an OTP (or TOTP challenge).
     * In production, SMS/Email OTP would be dispatched asynchronously.
     */
    @Transactional
    public MfaChallengeResult initiateChallenge(String userId, String actionContext, String ipAddress, String userAgent) {
        MfaEnrollment enrollment = enrollmentRepository.findByUserIdAndIsPrimaryTrueAndIsActiveTrue(userId)
                .orElseThrow(() -> new BusinessException("No active MFA enrollment found", "NO_MFA_ENROLLMENT"));

        if (enrollment.isLocked()) {
            throw new BusinessException("MFA is locked due to too many failures. Try again later.", "MFA_LOCKED");
        }

        String otp = generateOtp();
        String challengeId = "MFA-" + UUID.randomUUID().toString().substring(0, 16).toUpperCase();

        MfaChallenge challenge = MfaChallenge.builder()
                .challengeId(challengeId).userId(userId).mfaMethod(enrollment.getMfaMethod())
                .otpHash(hashValue(otp)).ipAddress(ipAddress).userAgent(userAgent)
                .actionContext(actionContext)
                .expiresAt(Instant.now().plus(OTP_VALIDITY_MINUTES, ChronoUnit.MINUTES))
                .build();

        challengeRepository.save(challenge);
        log.info("MFA challenge initiated: user={}, method={}, action={}", userId, enrollment.getMfaMethod(), actionContext);

        // In production: dispatch OTP via SMS/Email/Push here
        return new MfaChallengeResult(challengeId, enrollment.getMfaMethod(), otp); // otp returned for dev; production would not return it
    }

    @Transactional
    public boolean verifyChallenge(String challengeId, String otpInput) {
        MfaChallenge challenge = challengeRepository.findByChallengeIdAndStatus(challengeId, "PENDING")
                .orElseThrow(() -> new ResourceNotFoundException("MfaChallenge", "challengeId", challengeId));

        if (challenge.isExpired()) {
            challenge.setStatus("EXPIRED");
            challengeRepository.save(challenge);
            throw new BusinessException("MFA challenge expired", "MFA_EXPIRED");
        }

        if (!challenge.hasAttemptsRemaining()) {
            challenge.setStatus("FAILED");
            challengeRepository.save(challenge);
            throw new BusinessException("Maximum MFA attempts exceeded", "MFA_MAX_ATTEMPTS");
        }

        challenge.setAttempts(challenge.getAttempts() + 1);

        MfaEnrollment enrollment = enrollmentRepository.findByUserIdAndIsPrimaryTrueAndIsActiveTrue(challenge.getUserId()).orElse(null);

        if (hashValue(otpInput).equals(challenge.getOtpHash())) {
            challenge.setStatus("VERIFIED");
            challenge.setVerifiedAt(Instant.now());
            challengeRepository.save(challenge);
            if (enrollment != null) { enrollment.recordSuccess(); enrollmentRepository.save(enrollment); }
            log.info("MFA verified: challengeId={}, user={}", challengeId, challenge.getUserId());
            return true;
        } else {
            if (enrollment != null) { enrollment.recordFailure(MAX_FAILURES, LOCKOUT_MINUTES); enrollmentRepository.save(enrollment); }
            if (!challenge.hasAttemptsRemaining()) challenge.setStatus("FAILED");
            challengeRepository.save(challenge);
            log.warn("MFA verification failed: challengeId={}, attempt={}", challengeId, challenge.getAttempts());
            return false;
        }
    }

    public List<MfaEnrollment> getUserEnrollments(String userId) {
        return enrollmentRepository.findByUserIdAndIsActiveTrue(userId);
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = random.nextInt((int) Math.pow(10, OTP_LENGTH));
        return String.format("%0" + OTP_LENGTH + "d", otp);
    }

    private String generateTotpSecret() {
        byte[] bytes = new byte[20];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    private String hashValue(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes()));
        } catch (Exception e) { throw new RuntimeException("Hashing failed", e); }
    }

    public record MfaChallengeResult(String challengeId, String method, String otp) {}
}
