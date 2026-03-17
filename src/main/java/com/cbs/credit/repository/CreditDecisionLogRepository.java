package com.cbs.credit.repository;

import com.cbs.credit.entity.CreditDecisionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditDecisionLogRepository extends JpaRepository<CreditDecisionLog, Long> {

    List<CreditDecisionLog> findByApplicationIdOrderByExecutedAtDesc(Long applicationId);

    Page<CreditDecisionLog> findByCustomerIdOrderByExecutedAtDesc(Long customerId, Pageable pageable);
}
