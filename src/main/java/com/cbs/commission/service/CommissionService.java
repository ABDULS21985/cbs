package com.cbs.commission.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.commission.entity.CommissionAgreement;
import com.cbs.commission.entity.CommissionPayout;
import com.cbs.commission.repository.CommissionAgreementRepository;
import com.cbs.commission.repository.CommissionPayoutRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CommissionService {
    private final CommissionAgreementRepository agreementRepository;
    private final CommissionPayoutRepository payoutRepository;
    private final CurrentActorProvider currentActorProvider;

    @Value("${cbs.commission.tax-rate:0.10}")
    private BigDecimal taxRate;

    @Transactional
    public CommissionAgreement createAgreement(CommissionAgreement agreement) {
        if (agreement.getPartyId() == null || agreement.getPartyId().isBlank()) {
            throw new BusinessException("Party ID is required for commission agreement", "MISSING_PARTY_ID");
        }
        agreement.setAgreementCode("CA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        agreement.setStatus("DRAFT");
        CommissionAgreement saved = agreementRepository.save(agreement);
        log.info("AUDIT: Commission agreement created: code={}, party={}, actor={}",
                saved.getAgreementCode(), saved.getPartyId(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CommissionAgreement activateAgreement(String code) {
        CommissionAgreement a = getAgreementByCode(code);
        if (!"DRAFT".equals(a.getStatus())) {
            throw new BusinessException("Agreement " + code + " must be DRAFT to activate; current status: " + a.getStatus(), "INVALID_STATUS");
        }
        a.setStatus("ACTIVE");
        CommissionAgreement saved = agreementRepository.save(a);
        log.info("AUDIT: Commission agreement activated: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CommissionPayout calculatePayout(String agreementCode, BigDecimal grossSales, BigDecimal qualifyingSales, String period) {
        CommissionAgreement agreement = getAgreementByCode(agreementCode);
        // Agreement must be ACTIVE to calculate payout
        if (!"ACTIVE".equals(agreement.getStatus())) {
            throw new BusinessException("Agreement " + agreementCode + " must be ACTIVE to calculate payout; current status: " + agreement.getStatus(), "AGREEMENT_NOT_ACTIVE");
        }
        if (qualifyingSales == null || qualifyingSales.signum() < 0) {
            throw new BusinessException("Qualifying sales must be non-negative", "INVALID_QUALIFYING_SALES");
        }

        BigDecimal rate = agreement.getBaseRatePct() != null ? agreement.getBaseRatePct() : BigDecimal.ZERO;

        BigDecimal grossCommission = qualifyingSales.multiply(rate).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        return buildAndSavePayout(agreement, grossSales, qualifyingSales, rate, grossCommission, period);
    }

    private CommissionPayout buildAndSavePayout(CommissionAgreement agreement, BigDecimal grossSales,
                                                 BigDecimal qualifyingSales, BigDecimal rate,
                                                 BigDecimal grossCommission, String period) {
        BigDecimal tax = grossCommission.multiply(taxRate).setScale(4, RoundingMode.HALF_UP);
        BigDecimal net = grossCommission.subtract(tax);
        CommissionPayout payout = new CommissionPayout();
        payout.setPayoutCode("CP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        payout.setAgreementId(agreement.getId());
        payout.setPartyId(agreement.getPartyId());
        payout.setPartyName(agreement.getPartyName());
        payout.setPayoutPeriod(period);
        payout.setPeriodStart(LocalDate.now().withDayOfMonth(1));
        payout.setPeriodEnd(LocalDate.now());
        payout.setGrossSales(grossSales);
        payout.setQualifyingSales(qualifyingSales);
        payout.setCommissionRateApplied(rate);
        payout.setGrossCommission(grossCommission);
        payout.setTaxAmount(tax);
        payout.setNetCommission(net);
        payout.setStatus("CALCULATED");
        CommissionPayout saved = payoutRepository.save(payout);
        log.info("AUDIT: Commission payout calculated: code={}, agreement={}, gross={}, net={}, actor={}",
                saved.getPayoutCode(), agreement.getAgreementCode(), grossCommission, net, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CommissionPayout approvePayout(String payoutCode) {
        CommissionPayout p = payoutRepository.findByPayoutCode(payoutCode).orElseThrow(() -> new ResourceNotFoundException("CommissionPayout", "payoutCode", payoutCode));
        if ("PAID".equals(p.getStatus())) throw new BusinessException("Payout " + payoutCode + " is already PAID");
        if (!"CALCULATED".equals(p.getStatus())) {
            throw new BusinessException("Payout " + payoutCode + " must be CALCULATED to approve; current status: " + p.getStatus(), "INVALID_STATUS");
        }
        p.setStatus("APPROVED");
        // p.setApprovedAt(Instant.now()); // field available when entity is extended
        CommissionPayout saved = payoutRepository.save(p);
        log.info("AUDIT: Commission payout approved: code={}, net={}, actor={}",
                payoutCode, p.getNetCommission(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<CommissionAgreement> getAllAgreements() { return agreementRepository.findAll(); }
    public List<CommissionAgreement> getAgreementsByParty(String partyId) { return agreementRepository.findByPartyIdAndStatusOrderByEffectiveFromDesc(partyId, "ACTIVE"); }
    public List<CommissionPayout> getPayoutsByParty(String partyId) { return payoutRepository.findByPartyIdOrderByPeriodStartDesc(partyId); }
    public CommissionAgreement getAgreementByCode(String code) {
        return agreementRepository.findByAgreementCode(code).orElseThrow(() -> new ResourceNotFoundException("CommissionAgreement", "agreementCode", code));
    }
}
