package com.cbs.tdframework.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tdframework.entity.TdFrameworkAgreement;
import com.cbs.tdframework.repository.TdFrameworkAgreementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TdFrameworkService {

    private final TdFrameworkAgreementRepository agreementRepository;

    @Transactional
    public TdFrameworkAgreement create(TdFrameworkAgreement agreement) {
        agreement.setAgreementNumber("TDF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        agreement.setStatus("DRAFT");
        TdFrameworkAgreement saved = agreementRepository.save(agreement);
        log.info("TD Framework created: number={}, type={}, currency={}, minAmount={}",
                saved.getAgreementNumber(), saved.getAgreementType(), saved.getCurrency(), saved.getMinDepositAmount());
        return saved;
    }

    @Transactional
    public TdFrameworkAgreement approve(String agreementNumber, String approvedBy) {
        TdFrameworkAgreement a = getByNumber(agreementNumber);
        if (!"DRAFT".equals(a.getStatus()) && !"PENDING_APPROVAL".equals(a.getStatus()))
            throw new BusinessException("Only DRAFT/PENDING agreements can be approved");
        a.setStatus("ACTIVE");
        a.setApprovedBy(approvedBy);
        a.setUpdatedAt(Instant.now());
        log.info("TD Framework approved: number={}, by={}", agreementNumber, approvedBy);
        return agreementRepository.save(a);
    }

    /** Get applicable rate for a given amount and tenor under this framework */
    @SuppressWarnings("unchecked")
    public BigDecimal getApplicableRate(String agreementNumber, BigDecimal amount, int tenorDays) {
        TdFrameworkAgreement a = getByNumber(agreementNumber);
        if (!"ACTIVE".equals(a.getStatus())) throw new BusinessException("Agreement not active");
        if (amount.compareTo(a.getMinDepositAmount()) < 0) throw new BusinessException("Below minimum deposit: " + a.getMinDepositAmount());
        if (a.getMaxDepositAmount() != null && amount.compareTo(a.getMaxDepositAmount()) > 0) throw new BusinessException("Exceeds maximum deposit: " + a.getMaxDepositAmount());
        if (tenorDays < a.getMinTenorDays() || tenorDays > a.getMaxTenorDays()) throw new BusinessException("Tenor outside allowed range: " + a.getMinTenorDays() + "-" + a.getMaxTenorDays() + " days");

        if ("TIERED".equals(a.getRateStructure()) && a.getRateTiers() != null) {
            for (Map<String, Object> tier : a.getRateTiers()) {
                BigDecimal minAmt = new BigDecimal(tier.get("min_amount").toString());
                BigDecimal maxAmt = new BigDecimal(tier.get("max_amount").toString());
                if (amount.compareTo(minAmt) >= 0 && amount.compareTo(maxAmt) <= 0) {
                    return new BigDecimal(tier.get("rate").toString());
                }
            }
        }
        return a.getBaseRate() != null ? a.getBaseRate() : BigDecimal.ZERO;
    }

    public List<TdFrameworkAgreement> listAll() {
        return agreementRepository.findAllByOrderByCreatedAtDesc();
    }

    public TdFrameworkAgreement getByAgreementNumber(String number) {
        return getByNumber(number);
    }

    public List<TdFrameworkAgreement> getActiveByCustomer(Long customerId) {
        return agreementRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, "ACTIVE");
    }

    private TdFrameworkAgreement getByNumber(String number) {
        return agreementRepository.findByAgreementNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("TdFrameworkAgreement", "agreementNumber", number));
    }
}
