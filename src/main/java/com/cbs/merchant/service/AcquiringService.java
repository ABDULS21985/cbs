package com.cbs.merchant.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.merchant.entity.AcquiringFacility;
import com.cbs.merchant.entity.MerchantChargeback;
import com.cbs.merchant.entity.MerchantSettlement;
import com.cbs.merchant.repository.AcquiringFacilityRepository;
import com.cbs.merchant.repository.MerchantChargebackRepository;
import com.cbs.merchant.repository.MerchantSettlementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AcquiringService {

    private final AcquiringFacilityRepository facilityRepository;
    private final MerchantSettlementRepository settlementRepository;
    private final MerchantChargebackRepository chargebackRepository;

    @Transactional
    public AcquiringFacility setupFacility(AcquiringFacility facility) {
        facility.setStatus("SETUP");
        AcquiringFacility saved = facilityRepository.save(facility);
        log.info("Acquiring facility set up for merchant: {}", saved.getMerchantId());
        return saved;
    }

    @Transactional
    public AcquiringFacility activateFacility(Long facilityId) {
        AcquiringFacility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("AcquiringFacility", "id", facilityId));
        facility.setStatus("ACTIVE");
        AcquiringFacility saved = facilityRepository.save(facility);
        log.info("Acquiring facility activated: {}", facilityId);
        return saved;
    }

    @Transactional
    public MerchantSettlement processSettlement(Long merchantId, LocalDate date) {
        List<AcquiringFacility> facilities = facilityRepository.findByMerchantIdAndStatus(merchantId, "ACTIVE");
        if (facilities.isEmpty()) {
            throw new ResourceNotFoundException("AcquiringFacility", "merchantId", merchantId);
        }
        AcquiringFacility facility = facilities.get(0);

        MerchantSettlement settlement = MerchantSettlement.builder()
                .merchantId(merchantId)
                .facilityId(facility.getId())
                .settlementDate(date)
                .build();

        BigDecimal gross = settlement.getGrossTransactionAmount() != null ? settlement.getGrossTransactionAmount() : BigDecimal.ZERO;
        BigDecimal mdr = settlement.getMdrDeducted() != null ? settlement.getMdrDeducted() : BigDecimal.ZERO;
        BigDecimal otherFees = settlement.getOtherFeesDeducted() != null ? settlement.getOtherFeesDeducted() : BigDecimal.ZERO;
        BigDecimal chargebacks = settlement.getChargebackDeductions() != null ? settlement.getChargebackDeductions() : BigDecimal.ZERO;
        BigDecimal refunds = settlement.getRefundDeductions() != null ? settlement.getRefundDeductions() : BigDecimal.ZERO;
        BigDecimal reserve = settlement.getReserveHeld() != null ? settlement.getReserveHeld() : BigDecimal.ZERO;

        settlement.setNetSettlementAmount(gross.subtract(mdr).subtract(otherFees).subtract(chargebacks).subtract(refunds).subtract(reserve));
        MerchantSettlement saved = settlementRepository.save(settlement);
        log.info("Merchant settlement processed: merchant={}, date={}, net={}", merchantId, date, saved.getNetSettlementAmount());
        return saved;
    }

    @Transactional
    public MerchantChargeback recordChargeback(MerchantChargeback chargeback) {
        chargeback.setStatus("RECEIVED");
        MerchantChargeback saved = chargebackRepository.save(chargeback);
        log.info("Chargeback recorded: merchant={}, txRef={}", saved.getMerchantId(), saved.getOriginalTransactionRef());
        return saved;
    }

    @Transactional
    public MerchantChargeback submitRepresentment(Long chargebackId, String responseRef, Map<String, Object> evidence) {
        MerchantChargeback chargeback = chargebackRepository.findById(chargebackId)
                .orElseThrow(() -> new ResourceNotFoundException("MerchantChargeback", "id", chargebackId));
        chargeback.setRepresentmentSubmitted(true);
        chargeback.setMerchantResponseRef(responseRef);
        chargeback.setMerchantEvidence(evidence);
        chargeback.setStatus("REPRESENTMENT");
        MerchantChargeback saved = chargebackRepository.save(chargeback);
        log.info("Representment submitted for chargeback: {}", chargebackId);
        return saved;
    }

    public List<MerchantSettlement> getSettlementHistory(Long merchantId) {
        return settlementRepository.findByMerchantIdOrderBySettlementDateDesc(merchantId);
    }

    public Map<String, Object> getMerchantAnalytics(Long merchantId) {
        List<MerchantSettlement> settlements = settlementRepository.findByMerchantIdOrderBySettlementDateDesc(merchantId);
        BigDecimal totalVolume = settlements.stream()
                .map(s -> s.getGrossTransactionAmount() != null ? s.getGrossTransactionAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalMdr = settlements.stream()
                .map(s -> s.getMdrDeducted() != null ? s.getMdrDeducted() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<MerchantChargeback> chargebacks = chargebackRepository.findByMerchantIdOrderByTransactionDateDesc(merchantId);
        long chargebackCount = chargebacks.size();
        BigDecimal chargebackRate = totalVolume.compareTo(BigDecimal.ZERO) > 0
                ? BigDecimal.valueOf(chargebackCount).divide(BigDecimal.valueOf(settlements.size() > 0 ? settlements.size() : 1), 4, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("totalVolume", totalVolume);
        analytics.put("totalMdr", totalMdr);
        analytics.put("chargebackCount", chargebackCount);
        analytics.put("chargebackRate", chargebackRate);
        return analytics;
    }

    public Map<String, List<AcquiringFacility>> getPciComplianceReport() {
        List<AcquiringFacility> all = facilityRepository.findAll();
        return all.stream().collect(Collectors.groupingBy(f -> f.getPciComplianceStatus() != null ? f.getPciComplianceStatus() : "UNKNOWN"));
    }

    public List<AcquiringFacility> getFacilitiesByMerchant(Long merchantId) {
        return facilityRepository.findByMerchantId(merchantId);
    }

    public List<AcquiringFacility> getAllFacilities() {
        return facilityRepository.findAll();
    }

    public List<MerchantChargeback> getAllChargebacks() {
        return chargebackRepository.findAll();
    }

    public List<MerchantSettlement> getAllSettlements() {
        return settlementRepository.findAll();
    }
}
