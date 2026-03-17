package com.cbs.fixedincome.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fixedincome.entity.*;
import com.cbs.fixedincome.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class FixedIncomeService {

    private final SecurityHoldingRepository holdingRepository;
    private final CouponPaymentRepository couponRepository;

    @Transactional
    public SecurityHolding addHolding(SecurityHolding holding) {
        BigDecimal cost = holding.getPurchasePrice().multiply(holding.getUnits());
        holding.setAmortisedCost(cost);
        holding.setPremiumDiscount(cost.subtract(holding.getFaceValue()));
        holding.setLastAccrualDate(holding.getSettlementDate());

        // Generate coupon schedule
        SecurityHolding saved = holdingRepository.save(holding);
        if (holding.getCouponRate() != null && holding.getCouponRate().compareTo(BigDecimal.ZERO) > 0) {
            generateCouponSchedule(saved);
        }

        log.info("Security holding added: ref={}, type={}, face={}, cost={}", saved.getHoldingRef(),
                saved.getSecurityType(), saved.getFaceValue(), cost);
        return saved;
    }

    /** Daily accrual batch for all active holdings */
    @Transactional
    public int batchDailyAccrual() {
        List<SecurityHolding> active = holdingRepository.findByPortfolioCodeAndStatus(null, "ACTIVE");
        // fallback: get all active
        if (active.isEmpty()) active = holdingRepository.findByStatusOrderByMaturityDateAsc("ACTIVE", Pageable.unpaged()).getContent();

        int count = 0;
        for (SecurityHolding h : active) {
            BigDecimal dailyAccrual = h.dailyCouponAccrual();
            if (dailyAccrual.compareTo(BigDecimal.ZERO) > 0) {
                h.setAccruedInterest(h.getAccruedInterest().add(dailyAccrual));
                h.setLastAccrualDate(LocalDate.now());

                // Straight-line amortisation of premium/discount
                if (h.getPremiumDiscount() != null && h.getPremiumDiscount().compareTo(BigDecimal.ZERO) != 0) {
                    long daysToMaturity = ChronoUnit.DAYS.between(h.getSettlementDate(), h.getMaturityDate());
                    if (daysToMaturity > 0) {
                        BigDecimal dailyAmort = h.getPremiumDiscount().divide(BigDecimal.valueOf(daysToMaturity), 4, RoundingMode.HALF_UP);
                        h.setCumulativeAmortisation(h.getCumulativeAmortisation().add(dailyAmort));
                        h.setAmortisedCost(h.totalCost().subtract(h.getCumulativeAmortisation()));
                    }
                }
                holdingRepository.save(h);
                count++;
            }
        }
        log.info("Daily accrual processed for {} holdings", count);
        return count;
    }

    /** Mark-to-market all active holdings */
    @Transactional
    public int batchMarkToMarket(Map<String, BigDecimal> marketPrices) {
        int count = 0;
        for (Map.Entry<String, BigDecimal> entry : marketPrices.entrySet()) {
            holdingRepository.findByHoldingRef(entry.getKey()).ifPresent(h -> {
                h.setMarketPrice(entry.getValue());
                BigDecimal mtmValue = entry.getValue().multiply(h.getUnits()).setScale(2, RoundingMode.HALF_UP);
                h.setMtmValue(mtmValue);
                h.setUnrealisedGainLoss(mtmValue.subtract(h.getAmortisedCost() != null ? h.getAmortisedCost() : h.totalCost()));
                h.setLastMtmDate(LocalDate.now());
                holdingRepository.save(h);
            });
            count++;
        }
        log.info("MTM updated for {} holdings", count);
        return count;
    }

    /** Process matured holdings */
    @Transactional
    public int processMaturedHoldings() {
        List<SecurityHolding> matured = holdingRepository.findMaturedHoldings(LocalDate.now());
        for (SecurityHolding h : matured) {
            h.setStatus("MATURED");
            holdingRepository.save(h);
        }
        log.info("Matured {} security holdings", matured.size());
        return matured.size();
    }

    /** Process due coupon payments */
    @Transactional
    public int processDueCoupons() {
        List<SecurityHolding> due = holdingRepository.findDueCoupons(LocalDate.now());
        int count = 0;
        for (SecurityHolding h : due) {
            couponRepository.findByCouponDateAndStatus(LocalDate.now(), "PROJECTED").stream()
                    .filter(c -> c.getHoldingId().equals(h.getId()))
                    .forEach(c -> {
                        c.setStatus("RECEIVED");
                        c.setReceivedDate(LocalDate.now());
                        couponRepository.save(c);
                    });
            h.setAccruedInterest(BigDecimal.ZERO); // Reset after coupon
            advanceCouponDate(h);
            holdingRepository.save(h);
            count++;
        }
        log.info("Processed {} coupon payments", count);
        return count;
    }

    public SecurityHolding getHolding(Long id) {
        return holdingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("SecurityHolding", "id", id));
    }

    public List<SecurityHolding> getPortfolioHoldings(String portfolioCode) {
        return holdingRepository.findByPortfolioCodeAndStatus(portfolioCode, "ACTIVE");
    }

    public BigDecimal getPortfolioFaceValue(String portfolioCode) {
        return holdingRepository.totalFaceValueByPortfolio(portfolioCode);
    }

    private void generateCouponSchedule(SecurityHolding h) {
        int monthsInterval = switch (h.getCouponFrequency()) {
            case "ANNUAL" -> 12; case "SEMI_ANNUAL" -> 6; case "QUARTERLY" -> 3; case "MONTHLY" -> 1;
            default -> 0;
        };
        if (monthsInterval == 0) return;

        BigDecimal couponAmount = h.getFaceValue().multiply(h.getCouponRate())
                .divide(BigDecimal.valueOf(100L * (12 / monthsInterval)), 2, RoundingMode.HALF_UP);

        LocalDate couponDate = h.getSettlementDate().plusMonths(monthsInterval);
        while (!couponDate.isAfter(h.getMaturityDate())) {
            CouponPayment cp = CouponPayment.builder()
                    .holdingId(h.getId()).couponDate(couponDate)
                    .couponAmount(couponAmount).currencyCode(h.getCurrencyCode())
                    .status("PROJECTED").build();
            couponRepository.save(cp);
            couponDate = couponDate.plusMonths(monthsInterval);
        }
        h.setNextCouponDate(h.getSettlementDate().plusMonths(monthsInterval));
    }

    private void advanceCouponDate(SecurityHolding h) {
        int months = switch (h.getCouponFrequency()) {
            case "ANNUAL" -> 12; case "SEMI_ANNUAL" -> 6; case "QUARTERLY" -> 3; case "MONTHLY" -> 1;
            default -> 6;
        };
        if (h.getNextCouponDate() != null) h.setNextCouponDate(h.getNextCouponDate().plusMonths(months));
    }
}
