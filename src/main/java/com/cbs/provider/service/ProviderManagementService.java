package com.cbs.provider.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.provider.entity.ProviderHealthLog;
import com.cbs.provider.entity.ProviderTransactionLog;
import com.cbs.provider.entity.ServiceProvider;
import com.cbs.provider.repository.ProviderHealthLogRepository;
import com.cbs.provider.repository.ProviderTransactionLogRepository;
import com.cbs.provider.repository.ServiceProviderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ProviderManagementService {

    private final ServiceProviderRepository providerRepository;
    private final ProviderHealthLogRepository healthLogRepository;
    private final ProviderTransactionLogRepository transactionLogRepository;

    @Transactional
    public ServiceProvider registerProvider(ServiceProvider provider) {
        provider.setProviderCode("SP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        provider.setStatus("ONBOARDING");
        provider.setHealthStatus("UNKNOWN");
        provider.setCurrentMonthVolume(0);
        ServiceProvider saved = providerRepository.save(provider);
        log.info("Provider registered: code={}, type={}, name={}", saved.getProviderCode(), saved.getProviderType(), saved.getProviderName());
        return saved;
    }

    @Transactional
    public ServiceProvider activateProvider(Long providerId) {
        ServiceProvider provider = getById(providerId);
        provider.setStatus("ACTIVE");
        return providerRepository.save(provider);
    }

    @Transactional
    public ProviderHealthLog healthCheck(Long providerId, int responseTimeMs, int httpStatusCode, boolean isHealthy, String errorMessage) {
        ServiceProvider provider = getById(providerId);

        ProviderHealthLog healthLog = ProviderHealthLog.builder()
                .providerId(providerId)
                .checkTimestamp(Instant.now())
                .responseTimeMs(responseTimeMs)
                .httpStatusCode(httpStatusCode)
                .isHealthy(isHealthy)
                .errorMessage(errorMessage)
                .build();
        healthLogRepository.save(healthLog);

        // Update provider health status
        provider.setLastHealthCheckAt(Instant.now());
        provider.setActualAvgResponseTimeMs(responseTimeMs);
        if (isHealthy) {
            provider.setHealthStatus("HEALTHY");
        } else if (httpStatusCode >= 500) {
            provider.setHealthStatus("DOWN");
        } else {
            provider.setHealthStatus("DEGRADED");
        }
        providerRepository.save(provider);

        log.info("Health check: provider={}, healthy={}, responseMs={}", provider.getProviderCode(), isHealthy, responseTimeMs);
        return healthLog;
    }

    @Transactional
    public ProviderTransactionLog logTransaction(ProviderTransactionLog txnLog) {
        ServiceProvider provider = getById(txnLog.getProviderId());
        provider.setCurrentMonthVolume(provider.getCurrentMonthVolume() + 1);
        providerRepository.save(provider);
        return transactionLogRepository.save(txnLog);
    }

    @Transactional
    public ServiceProvider triggerFailover(Long providerId) {
        ServiceProvider provider = getById(providerId);
        if (provider.getFailoverProviderId() == null) {
            throw new BusinessException("No failover provider configured for: " + provider.getProviderCode());
        }

        ServiceProvider failover = getById(provider.getFailoverProviderId());
        provider.setStatus("SUSPENDED");
        failover.setStatus("ACTIVE");
        providerRepository.save(provider);
        providerRepository.save(failover);

        log.info("Failover triggered: {} -> {}", provider.getProviderCode(), failover.getProviderCode());
        return failover;
    }

    public Map<String, Object> getProviderDashboard(Long providerId) {
        ServiceProvider provider = getById(providerId);
        List<ProviderHealthLog> recentHealth = healthLogRepository.findTop10ByProviderIdOrderByCheckTimestampDesc(providerId);

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("provider", provider);
        dashboard.put("recentHealthChecks", recentHealth);
        dashboard.put("monthlyVolume", provider.getCurrentMonthVolume());

        if (!recentHealth.isEmpty()) {
            double avgResponseTime = recentHealth.stream()
                    .filter(h -> h.getResponseTimeMs() != null)
                    .mapToInt(ProviderHealthLog::getResponseTimeMs)
                    .average().orElse(0);
            long healthyCount = recentHealth.stream().filter(h -> Boolean.TRUE.equals(h.getIsHealthy())).count();
            dashboard.put("avgResponseTimeMs", avgResponseTime);
            dashboard.put("uptimePct", (double) healthyCount / recentHealth.size() * 100);
        }
        return dashboard;
    }

    public Map<String, BigDecimal> getProviderCostReport() {
        return providerRepository.findByStatus("ACTIVE").stream()
                .filter(p -> p.getMonthlyCost() != null)
                .collect(Collectors.toMap(ServiceProvider::getProviderCode, ServiceProvider::getMonthlyCost));
    }

    public Map<String, Object> getSlaComplianceReport() {
        List<ServiceProvider> active = providerRepository.findByStatus("ACTIVE");
        Map<String, Object> report = new HashMap<>();
        for (ServiceProvider p : active) {
            Map<String, Object> sla = new HashMap<>();
            sla.put("slaResponseTimeMs", p.getSlaResponseTimeMs());
            sla.put("actualResponseTimeMs", p.getActualAvgResponseTimeMs());
            sla.put("slaUptimePct", p.getSlaUptimePct());
            sla.put("actualUptimePct", p.getActualUptimePct());
            sla.put("compliant", p.getActualAvgResponseTimeMs() != null && p.getSlaResponseTimeMs() != null
                    && p.getActualAvgResponseTimeMs() <= p.getSlaResponseTimeMs());
            report.put(p.getProviderCode(), sla);
        }
        return report;
    }

    public ServiceProvider getByCode(String code) {
        return providerRepository.findByProviderCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceProvider", "providerCode", code));
    }

    private ServiceProvider getById(Long id) {
        return providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceProvider", "id", id));
    }
}
