package com.cbs.productanalytics.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductAnalyticsService {

    private final ProductPerformanceSnapshotRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ProductPerformanceSnapshot record(ProductPerformanceSnapshot snapshot) {
        // Input validation
        if (snapshot.getProductCode() == null || snapshot.getProductCode().isBlank()) {
            throw new BusinessException("productCode is required", "MISSING_PRODUCT_CODE");
        }
        if (snapshot.getPeriodType() == null || snapshot.getPeriodType().isBlank()) {
            throw new BusinessException("periodType is required", "MISSING_PERIOD_TYPE");
        }
        if (snapshot.getPeriodDate() == null) {
            throw new BusinessException("periodDate is required", "MISSING_PERIOD_DATE");
        }

        // Duplicate/period check: prevent duplicate snapshot for same product+period+date
        List<ProductPerformanceSnapshot> existing = repository.findByProductCodeAndPeriodTypeOrderByPeriodDateDesc(
                snapshot.getProductCode(), snapshot.getPeriodType());
        boolean duplicate = existing.stream()
                .anyMatch(e -> snapshot.getPeriodDate().equals(e.getPeriodDate()));
        if (duplicate) {
            throw new BusinessException("Snapshot already exists for product " + snapshot.getProductCode()
                    + " period " + snapshot.getPeriodType() + " date " + snapshot.getPeriodDate(), "DUPLICATE_SNAPSHOT");
        }

        snapshot.setSnapshotCode("PPS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // Null-safe calculations
        BigDecimal totalRevenue = snapshot.getTotalRevenue() != null ? snapshot.getTotalRevenue() : BigDecimal.ZERO;
        BigDecimal costOfFunds = snapshot.getCostOfFunds() != null ? snapshot.getCostOfFunds() : BigDecimal.ZERO;
        BigDecimal operatingCost = snapshot.getOperatingCost() != null ? snapshot.getOperatingCost() : BigDecimal.ZERO;
        BigDecimal provisionCharge = snapshot.getProvisionCharge() != null ? snapshot.getProvisionCharge() : BigDecimal.ZERO;

        // Auto-calculate net margin
        BigDecimal netMargin = totalRevenue.subtract(costOfFunds).subtract(operatingCost).subtract(provisionCharge);
        snapshot.setNetMargin(netMargin);

        // Auto-calculate return on product
        if (snapshot.getTotalBalance() != null && snapshot.getTotalBalance().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal returnOnProduct = netMargin.divide(snapshot.getTotalBalance(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            snapshot.setReturnOnProductPct(returnOnProduct);
        }

        // Auto-calculate cost to income
        if (totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal costToIncome = operatingCost.divide(totalRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            snapshot.setCostToIncomePct(costToIncome);
        }

        ProductPerformanceSnapshot saved = repository.save(snapshot);
        log.info("AUDIT: Product performance snapshot recorded by {}: code={}, product={}, period={}, netMargin={}",
                currentActorProvider.getCurrentActor(), saved.getSnapshotCode(), saved.getProductCode(), saved.getPeriodType(), netMargin);
        return saved;
    }

    public List<ProductPerformanceSnapshot> getByProduct(String productCode, String periodType) {
        return repository.findByProductCodeAndPeriodTypeOrderByPeriodDateDesc(productCode, periodType);
    }

    public List<ProductPerformanceSnapshot> getByFamily(String productFamily, String periodType, LocalDate periodDate) {
        return repository.findByProductFamilyAndPeriodTypeAndPeriodDateOrderByTotalRevenueDesc(productFamily, periodType, periodDate);
    }

    /**
     * Returns trend analysis for a product: computes period-over-period changes in key metrics.
     */
    public Map<String, Object> getTrendAnalysis(String productCode, String periodType) {
        List<ProductPerformanceSnapshot> snapshots = repository.findByProductCodeAndPeriodTypeOrderByPeriodDateDesc(productCode, periodType);
        if (snapshots.size() < 2) {
            return Map.of("productCode", productCode, "trend", "INSUFFICIENT_DATA", "periodsAvailable", snapshots.size());
        }

        ProductPerformanceSnapshot latest = snapshots.get(0);
        ProductPerformanceSnapshot previous = snapshots.get(1);

        BigDecimal revenueChange = latest.getTotalRevenue() != null && previous.getTotalRevenue() != null
                ? latest.getTotalRevenue().subtract(previous.getTotalRevenue()) : BigDecimal.ZERO;
        BigDecimal marginChange = latest.getNetMargin() != null && previous.getNetMargin() != null
                ? latest.getNetMargin().subtract(previous.getNetMargin()) : BigDecimal.ZERO;

        String trend = revenueChange.signum() > 0 ? "IMPROVING" : revenueChange.signum() < 0 ? "DECLINING" : "STABLE";

        return Map.of(
                "productCode", productCode,
                "trend", trend,
                "latestPeriod", latest.getPeriodDate().toString(),
                "revenueChange", revenueChange,
                "marginChange", marginChange,
                "periodsAvailable", snapshots.size()
        );
    }
}
