package com.cbs.provider.repository;

import com.cbs.provider.entity.ProviderTransactionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProviderTransactionLogRepository extends JpaRepository<ProviderTransactionLog, Long> {
    List<ProviderTransactionLog> findByProviderIdOrderByRequestTimestampDesc(Long providerId);
    List<ProviderTransactionLog> findByProviderIdAndResponseStatus(Long providerId, String responseStatus);
}
