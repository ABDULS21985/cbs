package com.cbs.intelligence.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.intelligence.entity.*;
import com.cbs.intelligence.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class DashboardService {

    private final DashboardDefinitionRepository dashboardRepository;
    private final DashboardWidgetRepository widgetRepository;

    @Transactional
    public DashboardDefinition createDashboard(DashboardDefinition dashboard) {
        DashboardDefinition saved = dashboardRepository.save(dashboard);
        log.info("Dashboard created: code={}, type={}", saved.getDashboardCode(), saved.getDashboardType());
        return saved;
    }

    @Transactional
    public DashboardWidget addWidget(Long dashboardId, DashboardWidget widget) {
        dashboardRepository.findById(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("DashboardDefinition", "id", dashboardId));
        widget.setDashboardId(dashboardId);
        return widgetRepository.save(widget);
    }

    public Map<String, Object> getDashboardWithWidgets(String dashboardCode) {
        DashboardDefinition dashboard = dashboardRepository.findByDashboardCode(dashboardCode)
                .orElseThrow(() -> new ResourceNotFoundException("DashboardDefinition", "code", dashboardCode));
        List<DashboardWidget> widgets = widgetRepository
                .findByDashboardIdAndIsActiveTrueOrderByPositionYAscPositionXAsc(dashboard.getId());
        return Map.of("dashboard", dashboard, "widgets", widgets);
    }

    public List<DashboardDefinition> getDashboardsByType(String type) {
        return dashboardRepository.findByDashboardTypeAndIsActiveTrueOrderByDashboardNameAsc(type);
    }

    public List<DashboardDefinition> getAllDashboards() {
        return dashboardRepository.findByIsActiveTrueOrderByDashboardNameAsc();
    }
}
