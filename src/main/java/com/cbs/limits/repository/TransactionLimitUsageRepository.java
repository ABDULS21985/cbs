package com.cbs.limits.repository;

import com.cbs.limits.entity.LimitType;
import com.cbs.limits.entity.TransactionLimitUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface TransactionLimitUsageRepository extends JpaRepository<TransactionLimitUsage, Long> {

    Optional<TransactionLimitUsage> findByAccountIdAndLimitTypeAndUsageDate(Long accountId, LimitType limitType, LocalDate usageDate);
}
