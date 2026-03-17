package com.cbs.integration.repository;

import com.cbs.integration.entity.IntegrationRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IntegrationRouteRepository extends JpaRepository<IntegrationRoute, Long> {
    Optional<IntegrationRoute> findByRouteCode(String routeCode);
    List<IntegrationRoute> findByIsActiveTrueOrderByRouteNameAsc();
    List<IntegrationRoute> findBySourceSystemAndIsActiveTrue(String sourceSystem);
    List<IntegrationRoute> findByHealthStatus(String healthStatus);
}
