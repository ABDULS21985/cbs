package com.cbs.merchant.service;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.merchant.entity.MerchantProfile;
import com.cbs.merchant.repository.MerchantProfileRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MerchantService {
    private final MerchantProfileRepository merchantRepository;
    @Transactional
    public MerchantProfile onboard(MerchantProfile merchant) {
        merchant.setMerchantId("MCH-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        merchant.setStatus("PENDING");
        log.info("Merchant onboarding: id={}, name={}, mcc={}", merchant.getMerchantId(), merchant.getMerchantName(), merchant.getMerchantCategoryCode());
        return merchantRepository.save(merchant);
    }
    @Transactional
    public MerchantProfile activate(String merchantId) {
        MerchantProfile m = getMerchant(merchantId);
        if ("PROHIBITED".equals(m.getRiskCategory())) throw new BusinessException("Cannot activate PROHIBITED merchant");
        m.setStatus("ACTIVE"); m.setOnboardedAt(Instant.now()); m.setUpdatedAt(Instant.now());
        return merchantRepository.save(m);
    }
    @Transactional
    public MerchantProfile suspend(String merchantId, String reason) {
        MerchantProfile m = getMerchant(merchantId); m.setStatus("SUSPENDED"); m.setUpdatedAt(Instant.now());
        log.warn("Merchant suspended: id={}, reason={}", merchantId, reason); return merchantRepository.save(m);
    }
    public List<MerchantProfile> getActive() { return merchantRepository.findByStatusOrderByMerchantNameAsc("ACTIVE"); }
    public List<MerchantProfile> getHighRisk() { return merchantRepository.findByRiskCategoryOrderByChargebackRateDesc("HIGH"); }
    private MerchantProfile getMerchant(String id) { return merchantRepository.findByMerchantId(id).orElseThrow(() -> new ResourceNotFoundException("MerchantProfile", "merchantId", id)); }

    public java.util.List<MerchantProfile> getAllMerchants() {
        return merchantRepository.findAll();
    }

}
