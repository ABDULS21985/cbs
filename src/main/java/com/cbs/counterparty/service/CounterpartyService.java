package com.cbs.counterparty.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.counterparty.entity.Counterparty;
import com.cbs.counterparty.repository.CounterpartyRepository;
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
public class CounterpartyService {

    private final CounterpartyRepository counterpartyRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public Counterparty create(Counterparty cp) {
        if (cp.getCounterpartyName() == null || cp.getCounterpartyName().isBlank()) {
            throw new BusinessException("Counterparty name is required", "MISSING_NAME");
        }
        cp.setCounterpartyCode("CP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        // Null safety on getCurrentExposure
        BigDecimal currentExposure = cp.getCurrentExposure() != null ? cp.getCurrentExposure() : BigDecimal.ZERO;
        cp.setCurrentExposure(currentExposure);
        if (cp.getTotalExposureLimit() != null) {
            cp.setAvailableLimit(cp.getTotalExposureLimit().subtract(currentExposure));
        }
        Counterparty saved = counterpartyRepository.save(cp);
        log.info("AUDIT: Counterparty created: code={}, name={}, actor={}",
                saved.getCounterpartyCode(), saved.getCounterpartyName(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public Counterparty updateExposure(String code, BigDecimal exposure) {
        Counterparty cp = getByCode(code);
        if (exposure == null) {
            throw new BusinessException("Exposure amount is required", "MISSING_EXPOSURE");
        }
        cp.setCurrentExposure(exposure);
        cp.setAvailableLimit(cp.getTotalExposureLimit() != null
                ? cp.getTotalExposureLimit().subtract(exposure) : null);
        // Block transaction on limit breach instead of just warning
        if (cp.getAvailableLimit() != null && cp.getAvailableLimit().signum() < 0) {
            throw new BusinessException("Counterparty exposure limit breached: code=" + code
                    + ", exposure=" + exposure + ", limit=" + cp.getTotalExposureLimit(), "LIMIT_BREACHED");
        }
        Counterparty saved = counterpartyRepository.save(cp);
        log.info("AUDIT: Counterparty exposure updated: code={}, exposure={}, available={}, actor={}",
                code, exposure, cp.getAvailableLimit(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public Counterparty verifyKyc(String code) {
        Counterparty cp = getByCode(code);
        if ("PROHIBITED".equals(cp.getRiskCategory())) {
            throw new BusinessException("Cannot verify KYC for PROHIBITED counterparty: " + code);
        }
        cp.setKycStatus("VERIFIED");
        cp.setKycReviewDate(LocalDate.now());
        Counterparty saved = counterpartyRepository.save(cp);
        log.info("AUDIT: Counterparty KYC verified: code={}, reviewDate={}, actor={}",
                code, cp.getKycReviewDate(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public Counterparty getByCode(String code) {
        return counterpartyRepository.findByCounterpartyCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Counterparty", "counterpartyCode", code));
    }

    public List<Counterparty> getAll() {
        return counterpartyRepository.findAllByOrderByCounterpartyNameAsc();
    }

    public List<Counterparty> getByType(String type) {
        return counterpartyRepository.findByCounterpartyTypeAndStatusOrderByCounterpartyNameAsc(type, "ACTIVE");
    }

    public List<Counterparty> getPendingKyc() {
        return counterpartyRepository.findByKycStatusOrderByCounterpartyNameAsc("PENDING");
    }
}
