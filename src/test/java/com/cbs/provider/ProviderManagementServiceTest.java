package com.cbs.provider;

import com.cbs.provider.entity.ProviderHealthLog;
import com.cbs.provider.entity.ServiceProvider;
import com.cbs.provider.repository.ProviderHealthLogRepository;
import com.cbs.provider.repository.ProviderTransactionLogRepository;
import com.cbs.provider.repository.ServiceProviderRepository;
import com.cbs.provider.service.ProviderManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProviderManagementServiceTest {

    @Mock
    private ServiceProviderRepository providerRepository;

    @Mock
    private ProviderHealthLogRepository healthLogRepository;

    @Mock
    private ProviderTransactionLogRepository transactionLogRepository;

    @InjectMocks
    private ProviderManagementService service;

    @Test
    @DisplayName("Health check updates provider status to HEALTHY when isHealthy=true")
    void healthCheckUpdatesStatusToHealthy() {
        ServiceProvider provider = new ServiceProvider();
        provider.setId(1L);
        provider.setProviderCode("SP-TEST00001");
        provider.setHealthStatus("UNKNOWN");
        provider.setCurrentMonthVolume(0);

        when(providerRepository.findById(1L)).thenReturn(Optional.of(provider));
        when(healthLogRepository.save(any(ProviderHealthLog.class))).thenAnswer(i -> i.getArgument(0));
        when(providerRepository.save(any(ServiceProvider.class))).thenAnswer(i -> i.getArgument(0));

        ProviderHealthLog result = service.healthCheck(1L, 150, 200, true, null);

        assertThat(result.getIsHealthy()).isTrue();
        assertThat(result.getResponseTimeMs()).isEqualTo(150);
        assertThat(provider.getHealthStatus()).isEqualTo("HEALTHY");
        assertThat(provider.getLastHealthCheckAt()).isNotNull();
    }

    @Test
    @DisplayName("Failover switches active provider to failover provider")
    void failoverSwitchesActiveProvider() {
        ServiceProvider primary = new ServiceProvider();
        primary.setId(1L);
        primary.setProviderCode("SP-PRIMARY");
        primary.setStatus("ACTIVE");
        primary.setFailoverProviderId(2L);

        ServiceProvider failover = new ServiceProvider();
        failover.setId(2L);
        failover.setProviderCode("SP-FAILOVER");
        failover.setStatus("ONBOARDING");

        when(providerRepository.findById(1L)).thenReturn(Optional.of(primary));
        when(providerRepository.findById(2L)).thenReturn(Optional.of(failover));
        when(providerRepository.save(any(ServiceProvider.class))).thenAnswer(i -> i.getArgument(0));

        ServiceProvider result = service.triggerFailover(1L);

        assertThat(result.getProviderCode()).isEqualTo("SP-FAILOVER");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(primary.getStatus()).isEqualTo("SUSPENDED");
    }
}
