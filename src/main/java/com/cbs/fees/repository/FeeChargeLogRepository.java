package com.cbs.fees.repository;

import com.cbs.fees.entity.FeeChargeLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeeChargeLogRepository extends JpaRepository<FeeChargeLog, Long> {

    Page<FeeChargeLog> findByAccountIdOrderByChargedAtDesc(Long accountId, Pageable pageable);

    Page<FeeChargeLog> findByFeeCodeOrderByChargedAtDesc(String feeCode, Pageable pageable);
}
