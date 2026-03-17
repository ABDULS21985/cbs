package com.cbs.payments.orchestration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface PaymentRailRepository extends JpaRepository<PaymentRail, Long> {
    Optional<PaymentRail> findByRailCode(String railCode);
    List<PaymentRail> findByIsActiveTrueAndIsAvailableTrueOrderByPriorityRankAsc();
}
