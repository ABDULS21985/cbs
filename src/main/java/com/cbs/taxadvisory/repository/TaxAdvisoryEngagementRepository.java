package com.cbs.taxadvisory.repository;

import com.cbs.taxadvisory.entity.TaxAdvisoryEngagement;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaxAdvisoryEngagementRepository extends JpaRepository<TaxAdvisoryEngagement, Long> {
    Optional<TaxAdvisoryEngagement> findByEngagementCode(String engagementCode);
    List<TaxAdvisoryEngagement> findByStatusIn(List<String> statuses);

    @Query("SELECT e FROM TaxAdvisoryEngagement e WHERE CAST(e.jurisdictions AS string) LIKE %:country%")
    List<TaxAdvisoryEngagement> findByJurisdictionsContaining(@Param("country") String country);

    @Query("SELECT COALESCE(SUM(e.advisoryFee), 0) FROM TaxAdvisoryEngagement e WHERE e.status = :status AND e.engagementEndDate BETWEEN :from AND :to")
    BigDecimal sumAdvisoryFeeByStatusAndDateRange(@Param("status") String status, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
