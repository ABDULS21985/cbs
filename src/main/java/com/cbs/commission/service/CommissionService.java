package com.cbs.commission.service;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.commission.entity.CommissionAgreement;
import com.cbs.commission.entity.CommissionPayout;
import com.cbs.commission.repository.CommissionAgreementRepository;
import com.cbs.commission.repository.CommissionPayoutRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CommissionService {
    private final CommissionAgreementRepository agreementRepository;
    private final CommissionPayoutRepository payoutRepository;

    @Transactional
    public CommissionAgreement createAgreement(CommissionAgreement agreement) {
        agreement.setAgreementCode("CA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        agreement.setStatus("DRAFT");
        return agreementRepository.save(agreement);
    }
    @Transactional
    public CommissionAgreement activateAgreement(String code) {
        CommissionAgreement a = getAgreementByCode(code); a.setStatus("ACTIVE"); return agreementRepository.save(a);
    }
    @Transactional
    public CommissionPayout calculatePayout(String agreementCode, BigDecimal grossSales, BigDecimal qualifyingSales, String period) {
        CommissionAgreement agreement = getAgreementByCode(agreementCode);
        BigDecimal rate = agreement.getBaseRatePct() != null ? agreement.getBaseRatePct() : BigDecimal.ZERO;
        BigDecimal grossCommission = qualifyingSales.multiply(rate).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal tax = grossCommission.multiply(new BigDecimal("0.10")).setScale(4, RoundingMode.HALF_UP);
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
        return payoutRepository.save(payout);
    }
    @Transactional
    public CommissionPayout approvePayout(String payoutCode) {
        CommissionPayout p = payoutRepository.findByPayoutCode(payoutCode).orElseThrow(() -> new ResourceNotFoundException("CommissionPayout", "payoutCode", payoutCode));
        if ("PAID".equals(p.getStatus())) throw new BusinessException("Payout " + payoutCode + " is already PAID");
        p.setStatus("APPROVED");
        return payoutRepository.save(p);
    }
    public List<CommissionAgreement> getAllAgreements() { return agreementRepository.findAll(); }
    public List<CommissionAgreement> getAgreementsByParty(String partyId) { return agreementRepository.findByPartyIdAndStatusOrderByEffectiveFromDesc(partyId, "ACTIVE"); }
    public List<CommissionPayout> getPayoutsByParty(String partyId) { return payoutRepository.findByPartyIdOrderByPeriodStartDesc(partyId); }
    public CommissionAgreement getAgreementByCode(String code) {
        return agreementRepository.findByAgreementCode(code).orElseThrow(() -> new ResourceNotFoundException("CommissionAgreement", "agreementCode", code));
    }
}
