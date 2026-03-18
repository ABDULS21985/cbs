package com.cbs.productanalytics.repository;

import com.cbs.productanalytics.entity.ProductPerformanceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProductPerformanceSnapshotRepository extends JpaRepository<ProductPerformanceSnapshot, Long> {
    Optional<ProductPerformanceSnapshot> findBySnapshotCode(String snapshotCode);
    List<ProductPerformanceSnapshot> findByProductCodeAndPeriodTypeOrderByPeriodDateDesc(String productCode, String periodType);
    List<ProductPerformanceSnapshot> findByProductFamilyAndPeriodTypeAndPeriodDateOrderByTotalRevenueDesc(String productFamily, String periodType, LocalDate periodDate);
}
