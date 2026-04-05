package com.cbs.modelops.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.modelops.entity.ModelLifecycleEvent;
import com.cbs.modelops.repository.ModelLifecycleEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ModelOpsService {

    private final ModelLifecycleEventRepository repository;
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_EVENT_TYPES = Set.of(
            "DEPLOYMENT", "VALIDATION", "MONITORING_ALERT", "DRIFT_DETECTED",
            "RETRAINING", "RETIREMENT", "PROMOTION", "ROLLBACK"
    );

    private static final Map<String, Set<String>> ALLOWED_STATUS_TRANSITIONS = Map.of(
            "DEVELOPMENT", Set.of("VALIDATION"),
            "VALIDATION", Set.of("PRODUCTION", "DEVELOPMENT"),
            "PRODUCTION", Set.of("RETIRED", "VALIDATION"),
            "RETIRED", Set.of()
    );

    private static final double DEFAULT_DRIFT_THRESHOLD = 0.15;
    private static final double DEFAULT_PERFORMANCE_ALERT_THRESHOLD = 0.70;

    @Transactional
    public ModelLifecycleEvent recordEvent(ModelLifecycleEvent event) {
        validateEvent(event);
        event.setEventCode("MLE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (event.getEventDate() == null) {
            event.setEventDate(LocalDate.now());
        }
        if (event.getStatus() == null || event.getStatus().isBlank()) {
            event.setStatus("RECORDED");
        }
        event.setPerformedBy(currentActorProvider.getCurrentActor());

        ModelLifecycleEvent saved = repository.save(event);
        log.info("Model lifecycle event recorded: code={}, model={}, type={}, by={}",
                saved.getEventCode(), saved.getModelCode(), saved.getEventType(), saved.getPerformedBy());
        return saved;
    }

    @Transactional
    public ModelLifecycleEvent promoteModel(String modelCode, String fromPhase, String toPhase, String approvalCommittee) {
        if (modelCode == null || modelCode.isBlank()) {
            throw new BusinessException("Model code is required for promotion.", "INVALID_MODEL_CODE");
        }
        if (fromPhase == null || toPhase == null) {
            throw new BusinessException("Both fromPhase and toPhase are required.", "INVALID_PHASE");
        }

        Set<String> allowed = ALLOWED_STATUS_TRANSITIONS.getOrDefault(fromPhase, Set.of());
        if (!allowed.contains(toPhase)) {
            throw new BusinessException(
                    String.format("Invalid model lifecycle transition: %s -> %s. Allowed from %s: %s",
                            fromPhase, toPhase, fromPhase, allowed),
                    "INVALID_LIFECYCLE_TRANSITION"
            );
        }

        if ("PRODUCTION".equals(toPhase) && (approvalCommittee == null || approvalCommittee.isBlank())) {
            throw new BusinessException("Approval committee is required to promote a model to PRODUCTION.", "APPROVAL_REQUIRED");
        }

        ModelLifecycleEvent event = new ModelLifecycleEvent();
        event.setEventCode("MLE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        event.setModelCode(modelCode);
        event.setModelName(modelCode);
        event.setEventType("PROMOTION");
        event.setEventDate(LocalDate.now());
        event.setPerformedBy(currentActorProvider.getCurrentActor());
        event.setDescription(String.format("Model promoted from %s to %s", fromPhase, toPhase));
        event.setApprovalCommittee(approvalCommittee);
        event.setRiskTierChange(fromPhase + " -> " + toPhase);
        event.setStatus("RECORDED");

        if ("PRODUCTION".equals(toPhase)) {
            event.setRegulatoryNotification(true);
        }

        ModelLifecycleEvent saved = repository.save(event);
        log.info("Model promoted: model={}, {} -> {}, by={}", modelCode, fromPhase, toPhase, saved.getPerformedBy());
        return saved;
    }

    @Transactional
    public ModelLifecycleEvent validateModel(String modelCode, Map<String, Object> validationFindings) {
        if (modelCode == null || modelCode.isBlank()) {
            throw new BusinessException("Model code is required for validation.", "INVALID_MODEL_CODE");
        }
        if (validationFindings == null || validationFindings.isEmpty()) {
            throw new BusinessException("Validation findings must be provided.", "EMPTY_FINDINGS");
        }

        ModelLifecycleEvent event = new ModelLifecycleEvent();
        event.setEventCode("MLE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        event.setModelCode(modelCode);
        event.setModelName(modelCode);
        event.setEventType("VALIDATION");
        event.setEventDate(LocalDate.now());
        event.setPerformedBy(currentActorProvider.getCurrentActor());
        event.setFindings(validationFindings);
        event.setStatus("RECORDED");

        boolean passed = !Boolean.FALSE.equals(validationFindings.get("passed"));
        event.setDescription(passed ? "Model validation PASSED" : "Model validation FAILED");

        ModelLifecycleEvent saved = repository.save(event);
        log.info("Model validation recorded: model={}, passed={}, by={}", modelCode, passed, saved.getPerformedBy());
        return saved;
    }

    @Transactional
    public ModelLifecycleEvent checkPerformance(String modelCode, Map<String, Object> metricsSnapshot) {
        if (modelCode == null || modelCode.isBlank()) {
            throw new BusinessException("Model code is required.", "INVALID_MODEL_CODE");
        }
        if (metricsSnapshot == null || metricsSnapshot.isEmpty()) {
            throw new BusinessException("Metrics snapshot must be provided.", "EMPTY_METRICS");
        }

        boolean alertTriggered = false;
        StringBuilder alertDetails = new StringBuilder();

        Object accuracyObj = metricsSnapshot.get("accuracy");
        if (accuracyObj instanceof Number) {
            double accuracy = ((Number) accuracyObj).doubleValue();
            if (accuracy < DEFAULT_PERFORMANCE_ALERT_THRESHOLD) {
                alertTriggered = true;
                alertDetails.append(String.format("Accuracy %.4f below threshold %.4f. ", accuracy, DEFAULT_PERFORMANCE_ALERT_THRESHOLD));
            }
        }

        Object latencyObj = metricsSnapshot.get("p99LatencyMs");
        if (latencyObj instanceof Number) {
            double latency = ((Number) latencyObj).doubleValue();
            if (latency > 5000) {
                alertTriggered = true;
                alertDetails.append(String.format("P99 latency %.0fms exceeds 5000ms threshold. ", latency));
            }
        }

        ModelLifecycleEvent event = new ModelLifecycleEvent();
        event.setEventCode("MLE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        event.setModelCode(modelCode);
        event.setModelName(modelCode);
        event.setEventType("MONITORING_ALERT");
        event.setEventDate(LocalDate.now());
        event.setPerformedBy("SYSTEM");
        event.setMetricsSnapshot(metricsSnapshot);
        event.setStatus(alertTriggered ? "RECORDED" : "ACKNOWLEDGED");
        event.setDescription(alertTriggered ? alertDetails.toString().trim() : "Performance within acceptable thresholds");

        ModelLifecycleEvent saved = repository.save(event);
        if (alertTriggered) {
            log.warn("Performance alert for model {}: {}", modelCode, alertDetails);
        } else {
            log.info("Performance check passed for model {}", modelCode);
        }
        return saved;
    }

    @Transactional
    public ModelLifecycleEvent detectDrift(String modelCode, Map<String, Object> metricsSnapshot) {
        if (modelCode == null || modelCode.isBlank()) {
            throw new BusinessException("Model code is required.", "INVALID_MODEL_CODE");
        }
        if (metricsSnapshot == null) {
            throw new BusinessException("Metrics snapshot is required for drift detection.", "EMPTY_METRICS");
        }

        boolean driftDetected = false;
        StringBuilder driftDetails = new StringBuilder();

        Object psiObj = metricsSnapshot.get("psi");
        if (psiObj instanceof Number) {
            double psi = ((Number) psiObj).doubleValue();
            if (psi > DEFAULT_DRIFT_THRESHOLD) {
                driftDetected = true;
                driftDetails.append(String.format("PSI %.4f exceeds drift threshold %.4f. ", psi, DEFAULT_DRIFT_THRESHOLD));
            }
        }

        Object featureDriftObj = metricsSnapshot.get("featureDriftPct");
        if (featureDriftObj instanceof Number) {
            double featureDrift = ((Number) featureDriftObj).doubleValue();
            if (featureDrift > 20.0) {
                driftDetected = true;
                driftDetails.append(String.format("Feature drift %.1f%% exceeds 20%% threshold. ", featureDrift));
            }
        }

        ModelLifecycleEvent event = new ModelLifecycleEvent();
        event.setEventCode("MLE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        event.setModelCode(modelCode);
        event.setModelName(modelCode);
        event.setEventType("DRIFT_DETECTED");
        event.setEventDate(LocalDate.now());
        event.setPerformedBy("SYSTEM");
        event.setMetricsSnapshot(metricsSnapshot);
        event.setStatus(driftDetected ? "RECORDED" : "ACKNOWLEDGED");
        event.setDescription(driftDetected ? driftDetails.toString().trim() : "No significant drift detected");

        ModelLifecycleEvent saved = repository.save(event);
        if (driftDetected) {
            log.warn("Drift detected for model {}: {}", modelCode, driftDetails);
        } else {
            log.info("Drift check passed for model {}", modelCode);
        }
        return saved;
    }

    @Transactional
    public ModelLifecycleEvent acknowledgeAlert(String eventCode) {
        ModelLifecycleEvent event = repository.findByEventCode(eventCode)
                .orElseThrow(() -> new ResourceNotFoundException("ModelLifecycleEvent", "eventCode", eventCode));
        if (!"RECORDED".equals(event.getStatus())) {
            throw new BusinessException("Only RECORDED events can be acknowledged.", "INVALID_STATUS");
        }
        event.setStatus("ACKNOWLEDGED");
        log.info("Alert acknowledged: eventCode={}, by={}", eventCode, currentActorProvider.getCurrentActor());
        return repository.save(event);
    }

    public List<ModelLifecycleEvent> getByModel(String modelCode) {
        if (modelCode == null || modelCode.isBlank()) {
            throw new BusinessException("Model code is required.", "INVALID_MODEL_CODE");
        }
        return repository.findByModelCodeOrderByEventDateDesc(modelCode);
    }

    public List<ModelLifecycleEvent> getAlerts() {
        return repository.findByEventTypeAndStatusOrderByEventDateDesc("MONITORING_ALERT", "RECORDED");
    }

    public List<ModelLifecycleEvent> getDriftEvents(String modelCode) {
        return repository.findByModelCodeAndEventTypeOrderByEventDateDesc(modelCode, "DRIFT_DETECTED");
    }

    public List<ModelLifecycleEvent> getModelVersionHistory(String modelCode) {
        return repository.findByModelCodeAndEventTypeOrderByEventDateDesc(modelCode, "PROMOTION");
    }

    private void validateEvent(ModelLifecycleEvent event) {
        if (event.getModelCode() == null || event.getModelCode().isBlank()) {
            throw new BusinessException("Model code is required.", "INVALID_MODEL_CODE");
        }
        if (event.getModelName() == null || event.getModelName().isBlank()) {
            throw new BusinessException("Model name is required.", "INVALID_MODEL_NAME");
        }
        if (event.getEventType() == null || event.getEventType().isBlank()) {
            throw new BusinessException("Event type is required.", "INVALID_EVENT_TYPE");
        }
        if (!VALID_EVENT_TYPES.contains(event.getEventType())) {
            throw new BusinessException(
                    "Invalid event type: " + event.getEventType() + ". Valid types: " + VALID_EVENT_TYPES,
                    "INVALID_EVENT_TYPE"
            );
        }
    }
}
