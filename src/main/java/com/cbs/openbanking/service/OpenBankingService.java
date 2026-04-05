package com.cbs.openbanking.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.openbanking.entity.*;
import com.cbs.openbanking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class OpenBankingService {

    private final ApiClientRepository clientRepository;
    private final ApiConsentRepository consentRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ApiClientRegistration registerClient(ApiClient client, String rawApiKey) {
        clientRepository.findByClientId(client.getClientId()).ifPresent(e -> {
            throw new BusinessException("Client ID exists: " + client.getClientId(), "DUPLICATE_CLIENT");
        });
        client.setApiKeyHash(hashKey(rawApiKey));
        ApiClient saved = clientRepository.save(client);
        log.info("API client registered: id={}, type={}", client.getClientId(), client.getClientType());
        return new ApiClientRegistration(saved, rawApiKey);
    }

    public boolean validateApiKey(String clientId, String rawApiKey) {
        return clientRepository.findByClientId(clientId)
                .map(c -> Boolean.TRUE.equals(c.getIsActive()) && c.getApiKeyHash().equals(hashKey(rawApiKey)) && !c.isRateLimited())
                .orElse(false);
    }

    @Transactional
    public ApiConsent createConsent(String clientId, Long customerId, String consentType,
                                      List<String> permissions, List<Long> accountIds, int validityMinutes) {
        clientRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("ApiClient", "clientId", clientId));

        String consentId = "CST-" + UUID.randomUUID().toString().substring(0, 16).toUpperCase();
        ApiConsent consent = ApiConsent.builder()
                .consentId(consentId).clientId(clientId).customerId(customerId)
                .consentType(consentType).permissions(permissions).accountIds(accountIds)
                .expiresAt(Instant.now().plus(validityMinutes, ChronoUnit.MINUTES))
                .status("AWAITING_AUTHORISATION").build();
        return consentRepository.save(consent);
    }

    @Transactional
    public ApiConsent authoriseConsent(String consentId, Long customerId) {
        ApiConsent consent = consentRepository.findByConsentId(consentId)
                .orElseThrow(() -> new ResourceNotFoundException("ApiConsent", "consentId", consentId));
        if (!consent.getCustomerId().equals(customerId)) throw new BusinessException("Consent does not belong to customer", "CONSENT_MISMATCH");
        if (consent.getExpiresAt() != null && consent.getExpiresAt().isBefore(Instant.now())) {
            consent.setStatus("EXPIRED");
            consentRepository.save(consent);
            throw new BusinessException("Consent " + consentId + " has expired", "CONSENT_EXPIRED");
        }
        if ("REVOKED".equals(consent.getStatus())) {
            throw new BusinessException("Consent " + consentId + " has been revoked", "CONSENT_REVOKED");
        }
        consent.setStatus("AUTHORISED");
        consent.setGrantedAt(Instant.now());
        log.info("AUDIT: Consent authorised: consentId={}, customerId={}", consentId, customerId);
        return consentRepository.save(consent);
    }

    /**
     * Validate that a consent is still valid (not expired, not revoked) before allowing API access.
     */
    public boolean validateConsent(String consentId, String requiredPermission) {
        ApiConsent consent = consentRepository.findByConsentId(consentId)
                .orElseThrow(() -> new ResourceNotFoundException("ApiConsent", "consentId", consentId));
        if (!"AUTHORISED".equals(consent.getStatus())) return false;
        if (consent.getExpiresAt() != null && consent.getExpiresAt().isBefore(Instant.now())) {
            consent.setStatus("EXPIRED");
            consentRepository.save(consent);
            return false;
        }
        if (requiredPermission != null && consent.getPermissions() != null) {
            return consent.getPermissions().contains(requiredPermission);
        }
        return true;
    }

    @Transactional
    public ApiConsent revokeConsent(String consentId) {
        ApiConsent consent = consentRepository.findByConsentId(consentId)
                .orElseThrow(() -> new ResourceNotFoundException("ApiConsent", "consentId", consentId));
        if ("REVOKED".equals(consent.getStatus())) {
            throw new BusinessException("Consent " + consentId + " is already revoked", "ALREADY_REVOKED");
        }
        consent.setStatus("REVOKED");
        consent.setRevokedAt(Instant.now());
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Consent revoked: consentId={}, actor={}", consentId, actor);
        return consentRepository.save(consent);
    }

    /**
     * Enforce rate limiting for an API client. Returns true if allowed, false if rate limited.
     * Updates the client's request count and checks against the configured limit.
     */
    @Transactional
    public boolean enforceRateLimit(String clientId) {
        ApiClient client = clientRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("ApiClient", "clientId", clientId));
        if (client.isRateLimited()) {
            log.warn("Rate limit exceeded for client: {}", clientId);
            return false;
        }
        client.incrementRequestCount();
        clientRepository.save(client);
        return true;
    }

    public List<ApiConsent> getCustomerConsents(Long customerId) {
        return consentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public List<ApiClient> getAllClients() { return clientRepository.findByIsActiveTrueOrderByClientNameAsc(); }

    @Transactional
    public ApiClient deactivateClient(String clientId) {
        ApiClient client = clientRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("ApiClient", "clientId", clientId));
        client.setIsActive(false);
        client.setUpdatedAt(Instant.now());
        log.info("API client deactivated: id={}", clientId);
        return clientRepository.save(client);
    }

    private String hashKey(String key) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(key.getBytes()));
        } catch (Exception e) { throw new RuntimeException("Key hashing failed", e); }
    }

    public record ApiClientRegistration(ApiClient client, String apiKey) {}

    public java.util.List<ApiConsent> getAllConsents() {
        return consentRepository.findAll();
    }

}
