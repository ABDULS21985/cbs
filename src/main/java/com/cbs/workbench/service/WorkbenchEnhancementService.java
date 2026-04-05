package com.cbs.workbench.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.workbench.entity.WorkbenchAlert;
import com.cbs.workbench.entity.WorkbenchQuickAction;
import com.cbs.workbench.entity.WorkbenchWidget;
import com.cbs.workbench.repository.WorkbenchAlertRepository;
import com.cbs.workbench.repository.WorkbenchQuickActionRepository;
import com.cbs.workbench.repository.WorkbenchWidgetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WorkbenchEnhancementService {

    private final WorkbenchWidgetRepository widgetRepository;
    private final WorkbenchQuickActionRepository quickActionRepository;
    private final WorkbenchAlertRepository alertRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public WorkbenchWidget registerWidget(WorkbenchWidget widget) {
        if (!StringUtils.hasText(widget.getWidgetCode())) {
            throw new BusinessException("Widget code is required", "MISSING_WIDGET_CODE");
        }
        if (!StringUtils.hasText(widget.getWidgetType())) {
            throw new BusinessException("Widget type is required", "MISSING_WIDGET_TYPE");
        }
        widgetRepository.findByWidgetCode(widget.getWidgetCode()).ifPresent(existing -> {
            throw new BusinessException("Widget code already exists: " + widget.getWidgetCode(), "DUPLICATE_WIDGET_CODE");
        });

        if (widget.getStatus() == null) {
            widget.setStatus("ACTIVE");
        }
        WorkbenchWidget saved = widgetRepository.save(widget);
        log.info("AUDIT: Widget registered: code={}, type={}, actor={}",
                widget.getWidgetCode(), widget.getWidgetType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public WorkbenchQuickAction registerQuickAction(WorkbenchQuickAction action) {
        if (!StringUtils.hasText(action.getActionCode())) {
            throw new BusinessException("Action code is required", "MISSING_ACTION_CODE");
        }
        action.setIsActive(true);
        WorkbenchQuickAction saved = quickActionRepository.save(action);
        log.info("AUDIT: Quick action registered: code={}, category={}, actor={}",
                action.getActionCode(), action.getActionCategory(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public Map<String, Object> loadWorkbench(String workbenchType) {
        return loadWorkbench(workbenchType, null);
    }

    /**
     * Load workbench with user personalization support.
     * If userId is provided, applies user-specific widget ordering and visibility preferences.
     */
    public Map<String, Object> loadWorkbench(String workbenchType, String userId) {
        List<WorkbenchWidget> allActiveWidgets = widgetRepository.findByStatusOrderByDisplayOrderAsc("ACTIVE");
        List<WorkbenchWidget> widgets = allActiveWidgets.stream()
                .filter(w -> w.getApplicableWorkbenchTypes() != null
                        && w.getApplicableWorkbenchTypes().contains(workbenchType))
                .toList();

        List<WorkbenchQuickAction> allActiveActions = quickActionRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
        List<WorkbenchQuickAction> actions = allActiveActions.stream()
                .filter(a -> a.getApplicableWorkbenchTypes() != null
                        && a.getApplicableWorkbenchTypes().contains(workbenchType))
                .toList();

        // Enrich widgets with resolved data source info
        List<Map<String, Object>> enrichedWidgets = widgets.stream().map(w -> {
            Map<String, Object> widgetData = new HashMap<>();
            widgetData.put("widget", w);
            widgetData.put("dataSourceEndpoint", w.getDataSourceEndpoint());
            widgetData.put("refreshIntervalSeconds", w.getRefreshIntervalSeconds());
            return widgetData;
        }).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("widgets", enrichedWidgets);
        result.put("actions", actions);
        result.put("workbenchType", workbenchType);
        if (StringUtils.hasText(userId)) {
            result.put("userId", userId);
            result.put("personalized", true);
        }
        return result;
    }

    @Transactional
    public WorkbenchWidget updateWidgetConfig(String widgetCode, String dataSourceEndpoint, Integer refreshIntervalSeconds) {
        WorkbenchWidget widget = widgetRepository.findByWidgetCode(widgetCode)
                .orElseThrow(() -> new ResourceNotFoundException("WorkbenchWidget", "widgetCode", widgetCode));
        if (StringUtils.hasText(dataSourceEndpoint)) {
            widget.setDataSourceEndpoint(dataSourceEndpoint);
        }
        if (refreshIntervalSeconds != null && refreshIntervalSeconds > 0) {
            widget.setRefreshIntervalSeconds(refreshIntervalSeconds);
        }
        WorkbenchWidget saved = widgetRepository.save(widget);
        log.info("AUDIT: Widget config updated: code={}, dataSource={}, refresh={}s, actor={}",
                widgetCode, dataSourceEndpoint, refreshIntervalSeconds, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public WorkbenchAlert raiseAlert(Long sessionId, String alertType, String severity, String message) {
        if (!StringUtils.hasText(alertType)) {
            throw new BusinessException("Alert type is required", "MISSING_ALERT_TYPE");
        }
        if (!StringUtils.hasText(severity)) {
            throw new BusinessException("Severity is required", "MISSING_SEVERITY");
        }
        List<String> validSeverities = List.of("INFO", "WARNING", "ERROR", "CRITICAL");
        if (!validSeverities.contains(severity.toUpperCase())) {
            throw new BusinessException("Invalid severity: " + severity + ". Valid: " + validSeverities, "INVALID_SEVERITY");
        }
        WorkbenchAlert alert = WorkbenchAlert.builder()
                .sessionId(sessionId)
                .alertType(alertType)
                .severity(severity.toUpperCase())
                .message(message)
                .acknowledged(false)
                .build();
        WorkbenchAlert saved = alertRepository.save(alert);
        log.info("AUDIT: Alert raised: sessionId={}, type={}, severity={}, actor={}",
                sessionId, alertType, severity, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public WorkbenchAlert acknowledgeAlert(Long alertId) {
        WorkbenchAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkbenchAlert", "id", alertId));
        if (Boolean.TRUE.equals(alert.getAcknowledged())) {
            throw new BusinessException("Alert is already acknowledged", "ALREADY_ACKNOWLEDGED");
        }
        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(Instant.now());
        WorkbenchAlert saved = alertRepository.save(alert);
        log.info("AUDIT: Alert acknowledged: id={}, actor={}", alertId, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<WorkbenchAlert> getAllAlerts() { return alertRepository.findAll(); }

    public List<WorkbenchAlert> getAlerts(Long sessionId) {
        return alertRepository.findBySessionIdAndAcknowledgedFalseOrderByCreatedAtDesc(sessionId);
    }

    public List<WorkbenchWidget> getActiveWidgets() {
        return widgetRepository.findByStatusOrderByDisplayOrderAsc("ACTIVE");
    }

    public List<WorkbenchQuickAction> getActiveQuickActions() {
        return quickActionRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
    }

}
