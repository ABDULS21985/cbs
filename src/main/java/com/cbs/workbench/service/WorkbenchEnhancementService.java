package com.cbs.workbench.service;

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

    @Transactional
    public WorkbenchWidget registerWidget(WorkbenchWidget widget) {
        widgetRepository.findByWidgetCode(widget.getWidgetCode()).ifPresent(existing -> {
            throw new BusinessException("Widget code already exists: " + widget.getWidgetCode(), "DUPLICATE_WIDGET_CODE");
        });
        log.info("Registering widget: code={}, type={}", widget.getWidgetCode(), widget.getWidgetType());
        return widgetRepository.save(widget);
    }

    @Transactional
    public WorkbenchQuickAction registerQuickAction(WorkbenchQuickAction action) {
        log.info("Registering quick action: code={}, category={}", action.getActionCode(), action.getActionCategory());
        return quickActionRepository.save(action);
    }

    public Map<String, Object> loadWorkbench(String workbenchType) {
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

        Map<String, Object> result = new HashMap<>();
        result.put("widgets", widgets);
        result.put("actions", actions);
        return result;
    }

    @Transactional
    public WorkbenchAlert raiseAlert(Long sessionId, String alertType, String severity, String message) {
        WorkbenchAlert alert = WorkbenchAlert.builder()
                .sessionId(sessionId)
                .alertType(alertType)
                .severity(severity)
                .message(message)
                .build();
        log.info("Alert raised: sessionId={}, type={}, severity={}", sessionId, alertType, severity);
        return alertRepository.save(alert);
    }

    @Transactional
    public WorkbenchAlert acknowledgeAlert(Long alertId) {
        WorkbenchAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkbenchAlert", "id", alertId));
        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(Instant.now());
        log.info("Alert acknowledged: id={}", alertId);
        return alertRepository.save(alert);
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
