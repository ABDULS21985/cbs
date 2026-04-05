package com.cbs.merchant.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.merchant.entity.MerchantProfile;
import com.cbs.merchant.repository.MerchantProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MerchantService {

    private static final Set<String> VALID_MCC_PREFIXES = Set.of("0", "1", "2", "3", "4", "5", "6", "7", "8", "9");

    private final MerchantProfileRepository merchantRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public MerchantProfile onboard(MerchantProfile merchant) {
        // Required field validation
        if (!StringUtils.hasText(merchant.getMerchantName())) {
            throw new BusinessException("merchantName is required", "MISSING_MERCHANT_NAME");
        }
        if (!StringUtils.hasText(merchant.getBusinessType())) {
            throw new BusinessException("businessType is required", "MISSING_BUSINESS_TYPE");
        }
        if (merchant.getMdrRate() == null) {
            throw new BusinessException("mdrRate is required", "MISSING_MDR_RATE");
        }

        // MCC validation: must be a 4-digit numeric code
        if (!StringUtils.hasText(merchant.getMerchantCategoryCode())
                || merchant.getMerchantCategoryCode().length() != 4
                || !merchant.getMerchantCategoryCode().chars().allMatch(Character::isDigit)) {
            throw new BusinessException("merchantCategoryCode must be a 4-digit numeric code", "INVALID_MCC");
        }

        // KYC/KYB validation: require registration number for onboarding
        if (!StringUtils.hasText(merchant.getRegistrationNumber())) {
            throw new BusinessException("registrationNumber is required for KYB compliance", "MISSING_REGISTRATION");
        }
        if (!StringUtils.hasText(merchant.getContactEmail())) {
            throw new BusinessException("contactEmail is required", "MISSING_CONTACT_EMAIL");
        }

        merchant.setMerchantId("MCH-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        merchant.setStatus("PENDING");
        MerchantProfile saved = merchantRepository.save(merchant);
        log.info("AUDIT: Merchant onboarded by {}: id={}, name={}, mcc={}, businessType={}",
                currentActorProvider.getCurrentActor(), saved.getMerchantId(), saved.getMerchantName(),
                saved.getMerchantCategoryCode(), saved.getBusinessType());
        return saved;
    }

    @Transactional
    public MerchantProfile activate(String merchantId) {
        MerchantProfile m = getMerchant(merchantId);
        if ("PROHIBITED".equals(m.getRiskCategory())) {
            throw new BusinessException("Cannot activate PROHIBITED merchant", "PROHIBITED_MERCHANT");
        }
        if (!"PENDING".equals(m.getStatus()) && !"SUSPENDED".equals(m.getStatus())) {
            throw new BusinessException("Cannot activate merchant in status " + m.getStatus() + "; must be PENDING or SUSPENDED", "INVALID_STATE");
        }
        m.setStatus("ACTIVE");
        m.setOnboardedAt(Instant.now());
        m.setUpdatedAt(Instant.now());
        log.info("AUDIT: Merchant activated by {}: id={}", currentActorProvider.getCurrentActor(), merchantId);
        return merchantRepository.save(m);
    }

    @Transactional
    public MerchantProfile suspend(String merchantId, String reason) {
        MerchantProfile m = getMerchant(merchantId);
        if ("SUSPENDED".equals(m.getStatus())) {
            throw new BusinessException("Merchant " + merchantId + " is already SUSPENDED", "ALREADY_SUSPENDED");
        }
        m.setStatus("SUSPENDED");
        m.setMonitoringLevel("ENHANCED");
        m.setUpdatedAt(Instant.now());
        log.warn("AUDIT: Merchant suspended by {}: id={}, reason={}", currentActorProvider.getCurrentActor(), merchantId, reason);
        return merchantRepository.save(m);
    }

    public List<MerchantProfile> getActive() {
        return merchantRepository.findByStatusOrderByMerchantNameAsc("ACTIVE");
    }

    public List<MerchantProfile> getHighRisk() {
        return merchantRepository.findByRiskCategoryOrderByChargebackRateDesc("HIGH");
    }

    public MerchantProfile getMerchant(String id) {
        return merchantRepository.findByMerchantId(id)
                .orElseThrow(() -> new ResourceNotFoundException("MerchantProfile", "merchantId", id));
    }

    public List<MerchantProfile> getAllMerchants() {
        return merchantRepository.findAll();
    }
}
