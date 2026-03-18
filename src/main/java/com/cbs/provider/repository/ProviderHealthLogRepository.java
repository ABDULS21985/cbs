package com.cbs.provider.repository;

import com.cbs.provider.entity.ProviderHealthLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProviderHealthLogRepository extends JpaRepository<ProviderHealthLog, Long> {
    List<ProviderHealthLog> findByProviderIdOrderByCheckTimestampDesc(Long providerId);
    List<ProviderHealthLog> findTop10ByProviderIdOrderByCheckTimestampDesc(Long providerId);
}
