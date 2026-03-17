package com.cbs.fraud.repository;

import com.cbs.fraud.entity.FraudAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface FraudAlertRepository extends JpaRepository<FraudAlert, Long> {
    Optional<FraudAlert> findByAlertRef(String ref);
    Page<FraudAlert> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    Page<FraudAlert> findByStatusOrderByRiskScoreDesc(String status, Pageable pageable);
    long countByStatus(String status);
    @Query(value = "SELECT nextval('cbs.fraud_alert_seq')", nativeQuery = true)
    Long getNextAlertSequence();
}
