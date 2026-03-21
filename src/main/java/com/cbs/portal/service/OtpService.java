package com.cbs.portal.service;

import com.cbs.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * Redis-backed OTP service for portal transfer verification.
 *
 * <p>Generates 6-digit codes, stores a SHA-256 hash in Redis with a 5-minute TTL,
 * and enforces a maximum of 5 verification attempts per session.</p>
 *
 * <p>The OTP is dispatched via the notification service (SMS or email) to the
 * customer's registered contact. When no SMS/email provider is configured,
 * the dispatcher logs the OTP body for development/testing purposes.</p>
 */
@Service
@Slf4j
public class OtpService {

    private static final String KEY_PREFIX = "portal:otp:";
    private static final String ATTEMPTS_PREFIX = "portal:otp:attempts:";
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final int MAX_ATTEMPTS = 5;
    private static final int OTP_LENGTH = 6;

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Generates a new OTP for the given context, stores it in Redis, and returns
     * the session ID and plaintext code (for dispatch via notification service).
     */
    public OtpSession generate(Long customerId, Long accountId) {
        String sessionId = UUID.randomUUID().toString();
        String code = generateCode();

        String key = KEY_PREFIX + sessionId;
        // Store: "customerId:accountId:hashedCode"
        String hashedCode = hashCode(code);
        String value = customerId + ":" + accountId + ":" + hashedCode;

        redisTemplate.opsForValue().set(key, value, OTP_TTL);
        redisTemplate.opsForValue().set(ATTEMPTS_PREFIX + sessionId, "0", OTP_TTL);

        log.info("OTP generated for customer={} account={} session={}", customerId, accountId, sessionId);
        return new OtpSession(sessionId, code, OTP_TTL.toSeconds());
    }

    /**
     * Verifies the OTP code against the stored session.
     *
     * @return true if verification succeeds
     * @throws BusinessException if session expired, max attempts exceeded, or code is wrong
     */
    public boolean verify(String sessionId, String code) {
        String key = KEY_PREFIX + sessionId;
        String stored = redisTemplate.opsForValue().get(key);

        if (stored == null) {
            throw new BusinessException("OTP session expired or not found", HttpStatus.BAD_REQUEST, "OTP_EXPIRED");
        }

        // Check attempt count
        String attemptsKey = ATTEMPTS_PREFIX + sessionId;
        String attemptsStr = redisTemplate.opsForValue().get(attemptsKey);
        int attempts = attemptsStr != null ? Integer.parseInt(attemptsStr) : 0;

        if (attempts >= MAX_ATTEMPTS) {
            // Invalidate the OTP session
            redisTemplate.delete(key);
            redisTemplate.delete(attemptsKey);
            throw new BusinessException("Maximum OTP verification attempts exceeded", HttpStatus.TOO_MANY_REQUESTS, "OTP_MAX_ATTEMPTS");
        }

        // Increment attempts
        redisTemplate.opsForValue().set(attemptsKey, String.valueOf(attempts + 1), OTP_TTL);

        // Extract stored hash and verify
        String[] parts = stored.split(":", 3);
        if (parts.length < 3) {
            throw new BusinessException("Invalid OTP session data", HttpStatus.INTERNAL_SERVER_ERROR, "OTP_DATA_CORRUPT");
        }

        String storedHash = parts[2];
        if (!storedHash.equals(hashCode(code))) {
            log.warn("OTP verification failed for session={} attempt={}/{}", sessionId, attempts + 1, MAX_ATTEMPTS);
            return false;
        }

        // Success — invalidate the session (one-time use)
        redisTemplate.delete(key);
        redisTemplate.delete(attemptsKey);
        log.info("OTP verified successfully for session={}", sessionId);
        return true;
    }

    /**
     * Invalidates an OTP session (e.g., when the user cancels the transfer).
     */
    public void invalidate(String sessionId) {
        redisTemplate.delete(KEY_PREFIX + sessionId);
        redisTemplate.delete(ATTEMPTS_PREFIX + sessionId);
    }

    private String generateCode() {
        int bound = (int) Math.pow(10, OTP_LENGTH);
        int code = secureRandom.nextInt(bound);
        return String.format("%0" + OTP_LENGTH + "d", code);
    }

    private String hashCode(String code) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(code.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public record OtpSession(String sessionId, String code, long expiresInSeconds) {}
}
