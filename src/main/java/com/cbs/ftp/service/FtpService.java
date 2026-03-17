package com.cbs.ftp.service;

import com.cbs.ftp.entity.*;
import com.cbs.ftp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FtpService {

    private final FtpRateCurveRepository curveRepository;
    private final FtpAllocationRepository allocationRepository;

    /**
     * Calculates FTP allocation for an entity (account/product/branch/customer).
     * Spread = actual rate - FTP rate.
     * Net margin = (spread × average balance) / 100.
     */
    @Transactional
    public FtpAllocation calculateFtp(String entityType, Long entityId, String entityRef,
                                        String currencyCode, BigDecimal averageBalance,
                                        BigDecimal actualRate, int tenorDays, LocalDate allocationDate) {
        BigDecimal ftpRate = curveRepository.findLatestRate("BASE", currencyCode, allocationDate, tenorDays)
                .map(FtpRateCurve::getRate)
                .orElse(new BigDecimal("5.00")); // Fallback rate

        BigDecimal spread = actualRate.subtract(ftpRate);
        BigDecimal interestIncomeExpense = averageBalance.multiply(actualRate)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal ftpCharge = averageBalance.multiply(ftpRate)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal netMargin = interestIncomeExpense.subtract(ftpCharge);

        FtpAllocation allocation = FtpAllocation.builder()
                .allocationDate(allocationDate).entityType(entityType)
                .entityId(entityId).entityRef(entityRef)
                .currencyCode(currencyCode).averageBalance(averageBalance)
                .actualRate(actualRate).ftpRate(ftpRate).spread(spread)
                .interestIncomeExpense(interestIncomeExpense)
                .ftpCharge(ftpCharge).netMargin(netMargin).build();

        FtpAllocation saved = allocationRepository.save(allocation);
        log.debug("FTP allocated: entity={}/{}, balance={}, actual={}%, ftp={}%, spread={}%, margin={}",
                entityType, entityId, averageBalance, actualRate, ftpRate, spread, netMargin);
        return saved;
    }

    @Transactional
    public FtpRateCurve addRatePoint(String curveName, String currencyCode, LocalDate effectiveDate,
                                       int tenorDays, BigDecimal rate) {
        FtpRateCurve curve = FtpRateCurve.builder()
                .curveName(curveName).currencyCode(currencyCode)
                .effectiveDate(effectiveDate).tenorDays(tenorDays).rate(rate).build();
        return curveRepository.save(curve);
    }

    public Page<FtpAllocation> getProfitabilityByEntity(String entityType, LocalDate date, Pageable pageable) {
        return allocationRepository.findByAllocationDateAndEntityTypeOrderByNetMarginDesc(date, entityType, pageable);
    }

    public Page<FtpAllocation> getEntityHistory(String entityType, Long entityId, Pageable pageable) {
        return allocationRepository.findByEntityTypeAndEntityIdOrderByAllocationDateDesc(entityType, entityId, pageable);
    }
}
