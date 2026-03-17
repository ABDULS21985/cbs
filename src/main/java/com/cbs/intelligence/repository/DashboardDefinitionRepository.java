package com.cbs.intelligence.repository;

import com.cbs.intelligence.entity.DashboardDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DashboardDefinitionRepository extends JpaRepository<DashboardDefinition, Long> {
    Optional<DashboardDefinition> findByDashboardCode(String code);
    List<DashboardDefinition> findByDashboardTypeAndIsActiveTrueOrderByDashboardNameAsc(String type);
    List<DashboardDefinition> findByIsActiveTrueOrderByDashboardNameAsc();
}
