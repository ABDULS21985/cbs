package com.cbs.fundmgmt.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fundmgmt.entity.ManagedFund;
import com.cbs.fundmgmt.repository.ManagedFundRepository;
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
public class FundManagementService {

    private final ManagedFundRepository fundRepository;

    @Transactional
    public ManagedFund create(ManagedFund fund) {
        fund.setFundCode("FND-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        fund.setStatus("DRAFT");
        ManagedFund saved = fundRepository.save(fund);
        log.info("Fund created: {}", saved.getFundCode());
        return saved;
    }

    @Transactional
    public ManagedFund updateNav(String fundCode, BigDecimal navPerUnit) {
        ManagedFund fund = getByCode(fundCode);
        fund.setNavPerUnit(navPerUnit);
        fund.setNavDate(LocalDate.now());
        fund.setTotalAum(navPerUnit.multiply(fund.getTotalUnitsOutstanding()));
        log.info("NAV updated: {} nav={} aum={}", fundCode, navPerUnit, fund.getTotalAum());
        return fundRepository.save(fund);
    }

    public ManagedFund getByCode(String code) {
        return fundRepository.findByFundCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ManagedFund", "fundCode", code));
    }

    public List<ManagedFund> getByType(String fundType) {
        return fundRepository.findByFundTypeAndStatusOrderByFundNameAsc(fundType, "ACTIVE");
    }

    public List<ManagedFund> getShariaCompliant() {
        return fundRepository.findByIsShariaCompliantTrueAndStatus("ACTIVE");
    }

    public List<ManagedFund> getByAum() {
        return fundRepository.findByStatusOrderByTotalAumDesc("ACTIVE");
    }
}
