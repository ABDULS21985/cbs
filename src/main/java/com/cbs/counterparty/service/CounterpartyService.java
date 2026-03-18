package com.cbs.counterparty.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.counterparty.entity.Counterparty;
import com.cbs.counterparty.repository.CounterpartyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CounterpartyService {

    private final CounterpartyRepository counterpartyRepository;

    @Transactional
    public Counterparty create(Counterparty cp) {
        cp.setCounterpartyCode("CP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (cp.getTotalExposureLimit() != null) {
            cp.setAvailableLimit(cp.getTotalExposureLimit().subtract(cp.getCurrentExposure()));
        }
        return counterpartyRepository.save(cp);
    }

    @Transactional
    public Counterparty updateExposure(String code, BigDecimal exposure) {
        Counterparty cp = getByCode(code);
        cp.setCurrentExposure(exposure);
        cp.setAvailableLimit(cp.getTotalExposureLimit() != null
                ? cp.getTotalExposureLimit().subtract(exposure) : null);
        if (cp.getAvailableLimit() != null && cp.getAvailableLimit().signum() < 0) {
            log.warn("Counterparty exposure limit breached: code={}, exposure={}, limit={}",
                    code, exposure, cp.getTotalExposureLimit());
        }
        return counterpartyRepository.save(cp);
    }

    @Transactional
    public Counterparty verifyKyc(String code) {
        Counterparty cp = getByCode(code);
        if ("PROHIBITED".equals(cp.getRiskCategory())) {
            throw new BusinessException("Cannot verify KYC for PROHIBITED counterparty: " + code);
        }
        cp.setKycStatus("VERIFIED");
        return counterpartyRepository.save(cp);
    }

    public Counterparty getByCode(String code) {
        return counterpartyRepository.findByCounterpartyCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Counterparty", "counterpartyCode", code));
    }

    public List<Counterparty> getByType(String type) {
        return counterpartyRepository.findByCounterpartyTypeAndStatusOrderByCounterpartyNameAsc(type, "ACTIVE");
    }

    public List<Counterparty> getPendingKyc() {
        return counterpartyRepository.findByKycStatusOrderByCounterpartyNameAsc("PENDING");
    }
}
