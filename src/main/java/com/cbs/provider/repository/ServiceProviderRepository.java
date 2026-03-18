package com.cbs.provider.repository;

import com.cbs.provider.entity.ServiceProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceProviderRepository extends JpaRepository<ServiceProvider, Long> {
    Optional<ServiceProvider> findByProviderCode(String providerCode);
    List<ServiceProvider> findByStatus(String status);
    List<ServiceProvider> findByProviderType(String providerType);
    List<ServiceProvider> findByHealthStatus(String healthStatus);
}
