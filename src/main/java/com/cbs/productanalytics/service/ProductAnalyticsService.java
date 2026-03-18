package com.cbs.productanalytics.service;

import com.cbs.productanalytics.entity.ProductPerformanceSnapshot;
import com.cbs.productanalytics.repository.ProductPerformanceSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductAnalyticsService {

    private final ProductPerformanceSnapshotRepository repository;

    @Transactional
    public ProductPerformanceSnapshot record(ProductPerformanceSnapshot snapshot) {
        snapshot.setSnapshotCode("PPS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // Auto-calculate net margin
        BigDecimal netMargin = snapshot.getTotalRevenue()
                .subtract(snapshot.getCostOfFunds())
                .subtract(snapshot.getOperatingCost())
                .subtract(snapshot.getProvisionCharge());
        snapshot.setNetMargin(netMargin);

        // Auto-calculate return on product
        if (snapshot.getTotalBalance() != null && snapshot.getTotalBalance().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal returnOnProduct = netMargin.divide(snapshot.getTotalBalance(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            snapshot.setReturnOnProductPct(returnOnProduct);
        }

        // Auto-calculate cost to income
        if (snapshot.getTotalRevenue() != null && snapshot.getTotalRevenue().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal costToIncome = snapshot.getOperatingCost().divide(snapshot.getTotalRevenue(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            snapshot.setCostToIncomePct(costToIncome);
        }

        return repository.save(snapshot);
    }

    public List<ProductPerformanceSnapshot> getByProduct(String productCode, String periodType) {
        return repository.findByProductCodeAndPeriodTypeOrderByPeriodDateDesc(productCode, periodType);
    }

    public List<ProductPerformanceSnapshot> getByFamily(String productFamily, String periodType, LocalDate periodDate) {
        return repository.findByProductFamilyAndPeriodTypeAndPeriodDateOrderByTotalRevenueDesc(productFamily, periodType, periodDate);
    }
}
