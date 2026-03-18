package com.cbs.fees.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.entity.DiscountScheme;
import com.cbs.fees.entity.SpecialPricingAgreement;
import com.cbs.fees.repository.DiscountSchemeRepository;
import com.cbs.fees.repository.SpecialPricingAgreementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PricingService {

    private final DiscountSchemeRepository discountSchemeRepository;
    private final SpecialPricingAgreementRepository specialPricingAgreementRepository;

    @Transactional
    public DiscountScheme createDiscountScheme(DiscountScheme scheme) {
        scheme.setSchemeCode("DS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        scheme.setStatus("DRAFT");
        log.info("Creating discount scheme: code={}, name={}", scheme.getSchemeCode(), scheme.getSchemeName());
        return discountSchemeRepository.save(scheme);
    }

    @Transactional
    public DiscountScheme evaluateDiscounts(Long customerId, String feeCode, BigDecimal amount) {
        LocalDate today = LocalDate.now();
        List<DiscountScheme> activeSchemes = discountSchemeRepository.findByStatusOrderByPriorityOrderAsc("ACTIVE");

        List<DiscountScheme> applicable = activeSchemes.stream()
                .filter(s -> s.getEffectiveFrom() != null && !s.getEffectiveFrom().isAfter(today))
                .filter(s -> s.getEffectiveTo() != null && !s.getEffectiveTo().isBefore(today))
                .filter(s -> s.getApplicableFeeIds() != null && s.getApplicableFeeIds().contains(feeCode))
                .toList();

        for (DiscountScheme scheme : applicable) {
            if (scheme.getMaxTotalBudget() != null
                    && scheme.getCurrentUtilization() != null
                    && scheme.getCurrentUtilization().compareTo(scheme.getMaxTotalBudget()) >= 0) {
                scheme.setStatus("EXHAUSTED");
                discountSchemeRepository.save(scheme);
                log.info("Discount scheme exhausted: code={}", scheme.getSchemeCode());
                continue;
            }
            log.info("Discount evaluated: scheme={}, customer={}, feeCode={}", scheme.getSchemeCode(), customerId, feeCode);
            return scheme;
        }

        return null;
    }

    @Transactional
    public SpecialPricingAgreement createSpecialPricing(SpecialPricingAgreement agreement) {
        agreement.setAgreementCode("SPA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        log.info("Creating special pricing agreement: code={}, customer={}", agreement.getAgreementCode(), agreement.getCustomerId());
        return specialPricingAgreementRepository.save(agreement);
    }

    @Transactional
    public SpecialPricingAgreement reviewSpecialPricing(Long agreementId) {
        SpecialPricingAgreement agreement = specialPricingAgreementRepository.findById(agreementId)
                .orElseThrow(() -> new ResourceNotFoundException("SpecialPricingAgreement", "id", agreementId));
        agreement.setStatus("UNDER_REVIEW");
        log.info("Special pricing under review: code={}", agreement.getAgreementCode());
        return specialPricingAgreementRepository.save(agreement);
    }

    public List<DiscountScheme> getDiscountUtilization() {
        return discountSchemeRepository.findByStatusOrderByPriorityOrderAsc("ACTIVE");
    }

    public List<SpecialPricingAgreement> getPricingComparison(Long customerId) {
        return specialPricingAgreementRepository.findByCustomerIdAndStatus(customerId, "ACTIVE");
    }
}
