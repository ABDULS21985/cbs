package com.cbs.payments.repository;

import com.cbs.payments.entity.FxRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FxRateRepository extends JpaRepository<FxRate, Long> {

    @Query("SELECT f FROM FxRate f WHERE f.sourceCurrency = :src AND f.targetCurrency = :tgt AND f.isActive = true ORDER BY f.rateDate DESC")
    List<FxRate> findLatestRate(@Param("src") String source, @Param("tgt") String target);

    Optional<FxRate> findBySourceCurrencyAndTargetCurrencyAndRateDate(String source, String target, LocalDate date);

    List<FxRate> findByRateDateAndIsActiveTrue(LocalDate date);
}
