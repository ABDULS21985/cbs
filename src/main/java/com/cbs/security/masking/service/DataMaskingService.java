package com.cbs.security.masking.service;

import com.cbs.security.masking.entity.MaskingPolicy;
import com.cbs.security.masking.repository.MaskingPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class DataMaskingService {

    private final MaskingPolicyRepository policyRepository;

    @Value("${cbs.security.environment:NON_PROD}")
    private String environment;

    /**
     * Applies all active masking policies for an entity type, filtered by user role and environment.
     * Returns a map of field_name → masked_value.
     */
    public Map<String, String> maskEntity(String entityType, Map<String, String> fieldValues, String userRole) {
        List<MaskingPolicy> policies = policyRepository.findByEntityTypeAndIsActiveTrue(entityType);
        Map<String, String> result = new LinkedHashMap<>(fieldValues);

        for (MaskingPolicy policy : policies) {
            if (!policy.appliesTo(userRole, environment)) continue;

            String fieldName = policy.getFieldName();
            String rawValue = fieldValues.get(fieldName);
            if (rawValue == null || rawValue.isEmpty()) continue;

            result.put(fieldName, applyMask(rawValue, policy));
        }

        return result;
    }

    /**
     * Masks a single value according to policy rules.
     */
    public String applyMask(String value, MaskingPolicy policy) {
        if (value == null || value.isEmpty()) return value;

        return switch (policy.getMaskingType()) {
            case "FULL_MASK" -> String.valueOf(policy.getMaskCharacter()).repeat(value.length());
            case "PARTIAL_MASK" -> partialMask(value, policy.getVisiblePrefix(), policy.getVisibleSuffix(), policy.getMaskCharacter());
            case "HASH" -> hashValue(value).substring(0, Math.min(16, hashValue(value).length()));
            case "TOKENISE" -> "TKN-" + hashValue(value).substring(0, 12);
            case "REDACT" -> "[REDACTED]";
            case "ENCRYPT" -> value; // Encryption handled by EncryptionService
            default -> value;
        };
    }

    private String partialMask(String value, int prefixLen, int suffixLen, char maskChar) {
        if (value.length() <= prefixLen + suffixLen) return String.valueOf(maskChar).repeat(value.length());
        String prefix = value.substring(0, Math.min(prefixLen, value.length()));
        String suffix = suffixLen > 0 ? value.substring(Math.max(0, value.length() - suffixLen)) : "";
        int maskLen = value.length() - prefix.length() - suffix.length();
        return prefix + String.valueOf(maskChar).repeat(maskLen) + suffix;
    }

    private String hashValue(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes()));
        } catch (Exception e) { return "HASH_ERROR"; }
    }

    // Policy management
    @Transactional
    public MaskingPolicy createPolicy(MaskingPolicy policy) { return policyRepository.save(policy); }
    public List<MaskingPolicy> getAllPolicies() { return policyRepository.findByIsActiveTrueOrderByEntityTypeAscFieldNameAsc(); }
    public List<MaskingPolicy> getPoliciesForEntity(String entityType) { return policyRepository.findByEntityTypeAndIsActiveTrue(entityType); }
}
