package com.cbs.tdframework.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tdframework.entity.TdFrameworkAgreement;
import com.cbs.tdframework.repository.TdFrameworkAgreementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TdFrameworkService {

    private final TdFrameworkAgreementRepository agreementRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TdFrameworkAgreement create(TdFrameworkAgreement agreement) {
        if (agreement.getMinDepositAmount() == null || agreement.getMinDepositAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Minimum deposit amount must be positive", "INVALID_MIN_DEPOSIT");
        }
        if (agreement.getMinTenorDays() == null || agreement.getMinTenorDays() <= 0) {
            throw new BusinessException("Minimum tenor days must be positive", "INVALID_MIN_TENOR");
        }
        agreement.setAgreementNumber("TDF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        agreement.setStatus("DRAFT");
        TdFrameworkAgreement saved = agreementRepository.save(agreement);
        log.info("AUDIT: TD Framework created: number={}, type={}, currency={}, minAmount={}, actor={}",
                saved.getAgreementNumber(), saved.getAgreementType(), saved.getCurrency(),
                saved.getMinDepositAmount(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TdFrameworkAgreement submitForApproval(String agreementNumber) {
        TdFrameworkAgreement a = getByNumber(agreementNumber);
        if (!"DRAFT".equals(a.getStatus())) {
            throw new BusinessException("Only DRAFT agreements can be submitted for approval", "INVALID_STATUS");
        }
        a.setStatus("PENDING_APPROVAL");
        a.setUpdatedAt(Instant.now());
        TdFrameworkAgreement saved = agreementRepository.save(a);
        log.info("AUDIT: TD Framework submitted for approval: number={}, actor={}",
                agreementNumber, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TdFrameworkAgreement approve(String agreementNumber) {
        TdFrameworkAgreement a = getByNumber(agreementNumber);
        if (!"DRAFT".equals(a.getStatus()) && !"PENDING_APPROVAL".equals(a.getStatus()))
            throw new BusinessException("Only DRAFT/PENDING agreements can be approved");
        String approvedBy = currentActorProvider.getCurrentActor();

        // Four-eyes validation: approver must not be the same person who approved previously
        if (approvedBy.equals(a.getApprovedBy())) {
            throw new BusinessException(
                    "Four-eyes principle: approver (" + approvedBy + ") cannot be the same as the previous approver",
                    "FOUR_EYES_VIOLATION");
        }

        a.setStatus("ACTIVE");
        a.setApprovedBy(approvedBy);
        a.setUpdatedAt(Instant.now());
        log.info("AUDIT: TD Framework approved: number={}, by={}", agreementNumber, approvedBy);
        return agreementRepository.save(a);
    }

    /**
     * Validates and returns the applicable rate for creating a deposit under this framework.
     * The actual deposit entity creation is handled by the caller/deposit service.
     */
    @Transactional
    public BigDecimal createDeposit(String agreementNumber, BigDecimal amount, int tenorDays) {
        TdFrameworkAgreement a = getByNumber(agreementNumber);
        if (!"ACTIVE".equals(a.getStatus())) {
            throw new BusinessException("Agreement must be ACTIVE to create deposits", "AGREEMENT_NOT_ACTIVE");
        }
        // Validate amount and tenor against agreement limits and return rate
        BigDecimal rate = getApplicableRate(agreementNumber, amount, tenorDays);
        a.setUpdatedAt(Instant.now());
        agreementRepository.save(a);

        log.info("AUDIT: Deposit validated under framework: agreement={}, amount={}, tenor={}d, rate={}, actor={}",
                agreementNumber, amount, tenorDays, rate, currentActorProvider.getCurrentActor());
        return rate;
    }

    /**
     * Validates rollover eligibility and returns the new applicable rate.
     */
    @Transactional
    public BigDecimal rolloverDeposit(String agreementNumber, BigDecimal amount, int newTenorDays) {
        TdFrameworkAgreement a = getByNumber(agreementNumber);
        if (!"ACTIVE".equals(a.getStatus())) {
            throw new BusinessException("Agreement must be ACTIVE for rollover", "AGREEMENT_NOT_ACTIVE");
        }
        if (!Boolean.TRUE.equals(a.getAutoRolloverEnabled())) {
            throw new BusinessException("Auto rollover is not enabled for this agreement", "ROLLOVER_NOT_ENABLED");
        }
        BigDecimal newRate = getApplicableRate(agreementNumber, amount, newTenorDays);
        a.setUpdatedAt(Instant.now());
        agreementRepository.save(a);
        log.info("AUDIT: Deposit rollover validated: agreement={}, amount={}, newTenor={}d, newRate={}, actor={}",
                agreementNumber, amount, newTenorDays, newRate, currentActorProvider.getCurrentActor());
        return newRate;
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
