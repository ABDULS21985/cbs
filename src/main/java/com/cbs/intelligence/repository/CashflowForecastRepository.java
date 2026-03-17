package com.cbs.intelligence.repository;

import com.cbs.intelligence.entity.CashflowForecast;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CashflowForecastRepository extends JpaRepository<CashflowForecast, Long> {
    Optional<CashflowForecast> findByForecastId(String forecastId);
    List<CashflowForecast> findByEntityTypeAndEntityIdAndStatusOrderByForecastDateDesc(String entityType, String entityId, String status);
    List<CashflowForecast> findByEntityTypeAndEntityIdOrderByForecastDateDesc(String entityType, String entityId);
}
