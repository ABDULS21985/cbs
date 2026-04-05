package com.cbs.fees.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
import java.math.RoundingMode;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public DiscountScheme createDiscountScheme(DiscountScheme scheme) {
        scheme.setSchemeCode("DS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        scheme.setStatus("DRAFT");
        log.info("Creating discount scheme: code={}, name={}", scheme.getSchemeCode(), scheme.getSchemeName());
        return discountSchemeRepository.save(scheme);
    }

    /**
     * Evaluate applicable discounts and calculate the actual discount amount.
     * Returns the best matching scheme with discountAmount populated, or null if no discount applies.
     */
    @Transactional
    public DiscountResult evaluateDiscounts(Long customerId, String feeCode, BigDecimal amount) {
        LocalDate today = LocalDate.now();
        List<DiscountScheme> activeSchemes = discountSchemeRepository.findByStatusOrderByPriorityOrderAsc("ACTIVE");

        List<DiscountScheme> applicable = activeSchemes.stream()
                .filter(s -> s.getEffectiveFrom() == null || !s.getEffectiveFrom().isAfter(today))
                .filter(s -> s.getEffectiveTo() == null || !s.getEffectiveTo().isBefore(today))
                .filter(s -> s.getApplicableFeeIds() == null || s.getApplicableFeeIds().isEmpty() || s.getApplicableFeeIds().contains(feeCode))
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

            // Calculate the actual discount amount
            BigDecimal discountAmount = calculateDiscountAmount(scheme, amount);

            // Cap discount at remaining budget if applicable
            if (scheme.getMaxTotalBudget() != null && scheme.getCurrentUtilization() != null) {
                BigDecimal remaining = scheme.getMaxTotalBudget().subtract(scheme.getCurrentUtilization());
                if (discountAmount.compareTo(remaining) > 0) {
                    discountAmount = remaining;
                }
            }

            log.info("AUDIT: Discount evaluated: scheme={}, customer={}, feeCode={}, originalAmount={}, discountAmount={}",
                    scheme.getSchemeCode(), customerId, feeCode, amount, discountAmount);
            return new DiscountResult(scheme, discountAmount, amount.subtract(discountAmount));
        }

        // No applicable discount — return empty result instead of throwing
        log.debug("No applicable discount for customer={}, feeCode={}, amount={}", customerId, feeCode, amount);
        return new DiscountResult(null, BigDecimal.ZERO, amount);
    }

    private BigDecimal calculateDiscountAmount(DiscountScheme scheme, BigDecimal amount) {
        if (scheme.getDiscountValue() == null || scheme.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal discount;
        if ("PERCENTAGE".equalsIgnoreCase(scheme.getDiscountBasis())) {
            discount = amount.multiply(scheme.getDiscountValue())
                    .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        } else {
            // FIXED or other basis — treat discountValue as a fixed amount
            discount = scheme.getDiscountValue().min(amount); // Don't exceed original amount
        }
        // Cap at maxDiscountAmount if configured
        if (scheme.getMaxDiscountAmount() != null && discount.compareTo(scheme.getMaxDiscountAmount()) > 0) {
            discount = scheme.getMaxDiscountAmount();
        }
        return discount;
    }

    public record DiscountResult(DiscountScheme scheme, BigDecimal discountAmount, BigDecimal netAmount) {}

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
        if (!"DRAFT".equals(agreement.getStatus()) && !"PENDING".equals(agreement.getStatus())) {
            throw new BusinessException("Special pricing " + agreement.getAgreementCode()
                    + " must be DRAFT or PENDING to review; current: " + agreement.getStatus());
        }
        agreement.setStatus("UNDER_REVIEW");
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Special pricing under review: code={}, actor={}", agreement.getAgreementCode(), actor);
        return specialPricingAgreementRepository.save(agreement);
    }

    @Transactional
    public SpecialPricingAgreement approveSpecialPricing(Long agreementId) {
        SpecialPricingAgreement agreement = specialPricingAgreementRepository.findById(agreementId)
                .orElseThrow(() -> new ResourceNotFoundException("SpecialPricingAgreement", "id", agreementId));
        if (!"UNDER_REVIEW".equals(agreement.getStatus())) {
            throw new BusinessException("Special pricing " + agreement.getAgreementCode()
                    + " must be UNDER_REVIEW to approve; current: " + agreement.getStatus());
        }
        agreement.setStatus("ACTIVE");
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Special pricing approved: code={}, customer={}, actor={}", agreement.getAgreementCode(), agreement.getCustomerId(), actor);
        return specialPricingAgreementRepository.save(agreement);
    }

    @Transactional
    public SpecialPricingAgreement rejectSpecialPricing(Long agreementId, String reason) {
        SpecialPricingAgreement agreement = specialPricingAgreementRepository.findById(agreementId)
                .orElseThrow(() -> new ResourceNotFoundException("SpecialPricingAgreement", "id", agreementId));
        if (!"UNDER_REVIEW".equals(agreement.getStatus())) {
            throw new BusinessException("Special pricing " + agreement.getAgreementCode()
                    + " must be UNDER_REVIEW to reject; current: " + agreement.getStatus());
        }
        agreement.setStatus("REJECTED");
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Special pricing rejected: code={}, reason={}, actor={}", agreement.getAgreementCode(), reason, actor);
        return specialPricingAgreementRepository.save(agreement);
    }

    public List<DiscountScheme> getAllDiscountSchemes() {
        return discountSchemeRepository.findAll();
    }

    public List<DiscountScheme> getActiveDiscountSchemes() {
        return discountSchemeRepository.findByStatusOrderByPriorityOrderAsc("ACTIVE");
    }

    /**
     * Returns active discount schemes with utilization data: current utilization, budget, and utilization percentage.
     */
    public List<DiscountScheme> getDiscountUtilization() {
        List<DiscountScheme> active = discountSchemeRepository.findByStatusOrderByPriorityOrderAsc("ACTIVE");
        // Also include exhausted schemes to show full utilization picture
        List<DiscountScheme> exhausted = discountSchemeRepository.findByStatusOrderByPriorityOrderAsc("EXHAUSTED");
        List<DiscountScheme> combined = new java.util.ArrayList<>(active);
        combined.addAll(exhausted);
        return combined;
    }

    public List<SpecialPricingAgreement> getPricingComparison(Long customerId) {
        return specialPricingAgreementRepository.findByCustomerIdAndStatus(customerId, "ACTIVE");
    }

    public List<SpecialPricingAgreement> getAllSpecialPricing() { return specialPricingAgreementRepository.findAll(); }
}
