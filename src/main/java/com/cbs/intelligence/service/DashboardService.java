package com.cbs.intelligence.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_WIDGET_TYPES = Set.of(
            "CHART", "TABLE", "KPI", "MAP", "HEATMAP", "GAUGE", "TEXT", "LIST");

    @Transactional
    public DashboardDefinition createDashboard(DashboardDefinition dashboard) {
        if (dashboard.getDashboardCode() == null || dashboard.getDashboardCode().isBlank()) {
            throw new BusinessException("Dashboard code is required");
        }
        // Duplicate dashboard code check
        dashboardRepository.findByDashboardCode(dashboard.getDashboardCode()).ifPresent(d -> {
            throw new BusinessException("Dashboard code already exists: " + dashboard.getDashboardCode());
        });
        DashboardDefinition saved = dashboardRepository.save(dashboard);
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Dashboard created: code={}, type={}, actor={}", saved.getDashboardCode(), saved.getDashboardType(), actor);
        return saved;
    }

    @Transactional
    public DashboardWidget addWidget(Long dashboardId, DashboardWidget widget) {
        dashboardRepository.findById(dashboardId)
                .orElseThrow(() -> new ResourceNotFoundException("DashboardDefinition", "id", dashboardId));
        // Widget validation
        if (widget.getWidgetType() == null || widget.getWidgetType().isBlank()) {
            throw new BusinessException("Widget type is required");
        }
        if (!VALID_WIDGET_TYPES.contains(widget.getWidgetType())) {
            throw new BusinessException("Invalid widget type: " + widget.getWidgetType() + ". Must be one of " + VALID_WIDGET_TYPES);
        }
        if (widget.getDataSource() == null || widget.getDataSource().isBlank()) {
            throw new BusinessException("Widget data source is required");
        }
        widget.setDashboardId(dashboardId);
        log.info("AUDIT: Widget added to dashboard {}: type={}, dataSource={}", dashboardId, widget.getWidgetType(), widget.getDataSource());
        return widgetRepository.save(widget);
    }

    public Map<String, Object> getDashboardWithWidgets(String dashboardCode) {
        DashboardDefinition dashboard = dashboardRepository.findByDashboardCode(dashboardCode)
                .orElseThrow(() -> new ResourceNotFoundException("DashboardDefinition", "code", dashboardCode));
        List<DashboardWidget> widgets = widgetRepository
                .findByDashboardIdAndIsActiveTrueOrderByPositionYAscPositionXAsc(dashboard.getId());

        // Resolve widget data: attach data source metadata so consumers know how to fetch data
        List<Map<String, Object>> resolvedWidgets = widgets.stream().map(w -> {
            Map<String, Object> resolved = new LinkedHashMap<>();
            resolved.put("widget", w);
            resolved.put("dataSourceRef", w.getDataSource());
            resolved.put("refreshIntervalSec", w.getRefreshOverrideSec() != null ? w.getRefreshOverrideSec() : 60);
            return resolved;
        }).toList();

        return Map.of("dashboard", dashboard, "widgets", resolvedWidgets);
    }

    public List<DashboardDefinition> getDashboardsByType(String type) {
        return dashboardRepository.findByDashboardTypeAndIsActiveTrueOrderByDashboardNameAsc(type);
    }

    public List<DashboardDefinition> getAllDashboards() {
        return dashboardRepository.findByIsActiveTrueOrderByDashboardNameAsc();
    }
}
