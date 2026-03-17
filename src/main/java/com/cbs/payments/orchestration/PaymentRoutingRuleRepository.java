package com.cbs.payments.orchestration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRoutingRuleRepository extends JpaRepository<PaymentRoutingRule, Long> {
    @Query("SELECT r FROM PaymentRoutingRule r WHERE r.isActive = true " +
           "AND r.effectiveFrom <= :date AND (r.effectiveTo IS NULL OR r.effectiveTo >= :date) " +
           "ORDER BY r.rulePriority ASC")
    List<PaymentRoutingRule> findActiveRulesOrdered(@org.springframework.data.repository.query.Param("date") LocalDate date);
}
