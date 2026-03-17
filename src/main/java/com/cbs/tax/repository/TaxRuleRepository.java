package com.cbs.tax.repository;

import com.cbs.tax.entity.TaxRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.*;

@Repository
public interface TaxRuleRepository extends JpaRepository<TaxRule, Long> {
    Optional<TaxRule> findByTaxCode(String taxCode);
    @Query("SELECT t FROM TaxRule t WHERE t.appliesTo IN (:event, 'ALL') AND t.isActive = true " +
           "AND t.effectiveFrom <= :date AND (t.effectiveTo IS NULL OR t.effectiveTo >= :date)")
    List<TaxRule> findApplicableRules(@Param("event") String event, @Param("date") LocalDate date);
}
