package com.cbs.fees.repository;

import com.cbs.fees.entity.FeeChargeLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.time.Instant;
import java.util.List;

@Repository
public interface FeeChargeLogRepository extends JpaRepository<FeeChargeLog, Long> {

    Page<FeeChargeLog> findByAccountIdOrderByChargedAtDesc(Long accountId, Pageable pageable);

    Page<FeeChargeLog> findByFeeCodeOrderByChargedAtDesc(String feeCode, Pageable pageable);

    /** Efficient single-status lookup — replaces findAll().stream().filter() */
    List<FeeChargeLog> findByStatusOrderByChargedAtDesc(String status);

    /** Multi-status lookup for waiver history (PENDING / WAIVED / REJECTED) */
    List<FeeChargeLog> findByStatusInOrderByChargedAtDesc(Collection<String> statuses);

    List<FeeChargeLog> findByIslamicFeeConfigurationIdOrderByChargedAtDesc(Long islamicFeeConfigurationId);

    List<FeeChargeLog> findByStatusAndReceivableBalanceGreaterThanOrderByChargedAtAsc(String status, java.math.BigDecimal receivableBalance);

    List<FeeChargeLog> findByDeferredRemainingAmountGreaterThanOrderByChargedAtAsc(java.math.BigDecimal deferredRemainingAmount);

    List<FeeChargeLog> findByChargedAtBetweenOrderByChargedAtDesc(Instant from, Instant to);

    boolean existsByTriggerRef(String triggerRef);
}
