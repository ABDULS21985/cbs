package com.cbs.merchant.service;

import com.cbs.common.exception.BusinessException;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AcquiringService {

    private final AcquiringFacilityRepository facilityRepository;
    private final MerchantSettlementRepository settlementRepository;
    private final MerchantChargebackRepository chargebackRepository;

    // ── Facility operations ──────────────────────────────────────────────────────

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

    public List<AcquiringFacility> getAllFacilities() {
        return facilityRepository.findAll();
    }

    public List<AcquiringFacility> getFacilitiesByMerchant(Long merchantId) {
        return facilityRepository.findByMerchantId(merchantId);
    }

    // ── Settlement processing ────────────────────────────────────────────────────

    /**
     * Process a settlement for a merchant on a given date.
     *
     * Business logic:
     * 1. Find the merchant's active acquiring facility (for MDR rate, reserve hold %)
     * 2. Check for duplicate settlement on the same date
     * 3. Aggregate chargeback deductions from chargebacks filed on/before the settlement date
     * 4. Compute gross amount from existing settlement data or default to zero
     *    (in a real system, this would aggregate from a transaction log)
     * 5. Apply MDR rate, other fees, chargeback deductions, and reserve hold
     * 6. Calculate net settlement amount
     * 7. Persist with CALCULATED status
     */
    @Transactional
    public MerchantSettlement processSettlement(Long merchantId, LocalDate date) {
        // Validate: find active facility
        List<AcquiringFacility> facilities = facilityRepository.findByMerchantIdAndStatus(merchantId, "ACTIVE");
        if (facilities.isEmpty()) {
            throw new BusinessException("No active acquiring facility found for merchant " + merchantId
                    + ". Set up and activate a facility before processing settlements.");
        }
        AcquiringFacility facility = facilities.get(0);

        // Check for duplicate settlement on same date
        List<MerchantSettlement> existing = settlementRepository
                .findByMerchantIdAndSettlementDate(merchantId, date);
        if (!existing.isEmpty()) {
            throw new BusinessException("Settlement already exists for merchant " + merchantId
                    + " on date " + date + ". Settlement ID: " + existing.get(0).getId());
        }

        // Aggregate chargeback deductions for chargebacks received up to the settlement date
        List<MerchantChargeback> merchantChargebacks = chargebackRepository
                .findByMerchantIdOrderByTransactionDateDesc(merchantId);
        BigDecimal chargebackDeductions = merchantChargebacks.stream()
                .filter(cb -> cb.getTransactionDate() != null && !cb.getTransactionDate().isAfter(date))
                .filter(cb -> !"CLOSED".equals(cb.getStatus()) || "MERCHANT_LOSS".equals(cb.getOutcome()) || "SPLIT".equals(cb.getOutcome()))
                .map(cb -> cb.getChargebackAmount() != null ? cb.getChargebackAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // In a real system, gross would come from a transaction ledger.
        // Here we derive a representative gross from the settlement count and facility limits.
        // For now, start with the facility's daily transaction limit as an approximation,
        // or a default if not configured.
        BigDecimal gross = facility.getDailyTransactionLimit() != null
                ? facility.getDailyTransactionLimit()
                : new BigDecimal("50000.00");

        // Apply MDR rate from the facility
        BigDecimal mdrRate = facility.getMdrRatePct() != null
                ? facility.getMdrRatePct()
                : BigDecimal.ZERO;
        BigDecimal mdrDeducted = gross
                .multiply(mdrRate)
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);

        // Other fees — standard acquiring fee calculation (interchange approximation)
        BigDecimal otherFees = gross
                .multiply(new BigDecimal("0.15"))
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);

        // Reserve hold based on facility configuration
        BigDecimal reserveHoldPct = facility.getReserveHoldPct() != null
                ? facility.getReserveHoldPct()
                : BigDecimal.ZERO;
        BigDecimal reserveHeld = gross
                .multiply(reserveHoldPct)
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);

        // No refund data source yet — default to zero
        BigDecimal refundDeductions = BigDecimal.ZERO;

        // Calculate net settlement
        BigDecimal net = gross
                .subtract(mdrDeducted)
                .subtract(otherFees)
                .subtract(chargebackDeductions)
                .subtract(refundDeductions)
                .subtract(reserveHeld);

        // Determine transaction count (approximation based on average ticket size)
        int transactionCount = gross.compareTo(BigDecimal.ZERO) > 0
                ? gross.divide(new BigDecimal("75.00"), 0, RoundingMode.CEILING).intValue()
                : 0;

        MerchantSettlement settlement = MerchantSettlement.builder()
                .merchantId(merchantId)
                .facilityId(facility.getId())
                .settlementDate(date)
                .grossTransactionAmount(gross)
                .transactionCount(transactionCount)
                .mdrDeducted(mdrDeducted)
                .otherFeesDeducted(otherFees)
                .chargebackDeductions(chargebackDeductions)
                .refundDeductions(refundDeductions)
                .reserveHeld(reserveHeld)
                .netSettlementAmount(net)
                .settlementAccountId(null)
                .settlementReference("STL-" + merchantId + "-" + date)
                .status("CALCULATED")
                .build();

        MerchantSettlement saved = settlementRepository.save(settlement);
        log.info("Settlement processed: merchant={}, date={}, gross={}, mdr={}, net={}, txCount={}",
                merchantId, date, gross, mdrDeducted, net, transactionCount);
        return saved;
    }

    public List<MerchantSettlement> getSettlementHistory(Long merchantId) {
        return settlementRepository.findByMerchantIdOrderBySettlementDateDesc(merchantId);
    }

    public List<MerchantSettlement> getAllSettlements() {
        return settlementRepository.findAll();
    }

    // ── Chargeback operations ────────────────────────────────────────────────────

    @Transactional
    public MerchantChargeback recordChargeback(MerchantChargeback chargeback) {
        chargeback.setStatus("RECEIVED");
        chargeback.setRepresentmentSubmitted(false);
        chargeback.setArbitrationRequired(false);
        MerchantChargeback saved = chargebackRepository.save(chargeback);
        log.info("Chargeback recorded: merchant={}, txRef={}, amount={}",
                saved.getMerchantId(), saved.getOriginalTransactionRef(), saved.getChargebackAmount());
        return saved;
    }

    @Transactional
    public MerchantChargeback submitRepresentment(Long chargebackId, String responseRef, Map<String, Object> evidence) {
        MerchantChargeback chargeback = chargebackRepository.findById(chargebackId)
                .orElseThrow(() -> new ResourceNotFoundException("MerchantChargeback", "id", chargebackId));

        // Validate status — can only submit representment for actionable chargebacks
        String status = chargeback.getStatus();
        if ("CLOSED".equals(status) || "REPRESENTMENT".equals(status)) {
            throw new BusinessException("Cannot submit representment for chargeback in status: " + status);
        }

        chargeback.setRepresentmentSubmitted(true);
        chargeback.setMerchantResponseRef(responseRef);
        chargeback.setMerchantEvidence(evidence);
        chargeback.setStatus("REPRESENTMENT");
        MerchantChargeback saved = chargebackRepository.save(chargeback);
        log.info("Representment submitted for chargeback: {}, responseRef={}", chargebackId, responseRef);
        return saved;
    }

    public List<MerchantChargeback> getAllChargebacks() {
        return chargebackRepository.findAll();
    }

    // ── Analytics & compliance ────────────────────────────────────────────────────

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
                ? BigDecimal.valueOf(chargebackCount).divide(
                        BigDecimal.valueOf(settlements.size() > 0 ? settlements.size() : 1), 4, RoundingMode.HALF_UP)
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
        return all.stream().collect(Collectors.groupingBy(
                f -> f.getPciComplianceStatus() != null ? f.getPciComplianceStatus() : "UNKNOWN"));
    }
}
