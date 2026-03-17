package com.cbs.intelligence.repository;

import com.cbs.intelligence.entity.DashboardWidget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DashboardWidgetRepository extends JpaRepository<DashboardWidget, Long> {
    List<DashboardWidget> findByDashboardIdAndIsActiveTrueOrderByPositionYAscPositionXAsc(Long dashboardId);
}
