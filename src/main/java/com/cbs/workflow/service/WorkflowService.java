package com.cbs.workflow.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.workflow.entity.*;
import com.cbs.workflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WorkflowService {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowInstanceRepository instanceRepository;

    @Transactional
    public WorkflowInstance initiateWorkflow(String entityType, String triggerEvent, Long entityId,
                                               String entityRef, BigDecimal amount, String currencyCode,
                                               String initiatedBy) {
        List<WorkflowDefinition> defs = definitionRepository
                .findByEntityTypeAndTriggerEventAndIsActiveTrue(entityType, triggerEvent);

        if (defs.isEmpty()) {
            log.debug("No workflow defined for {}/{}", entityType, triggerEvent);
            return null; // No workflow needed — auto-approve
        }

        WorkflowDefinition def = defs.get(0);

        // Auto-approve below threshold
        if (def.getAutoApproveBelow() != null && amount != null &&
                amount.compareTo(def.getAutoApproveBelow()) < 0) {
            log.info("Auto-approved: {} {} below threshold {}", entityType, entityId, def.getAutoApproveBelow());
            return createAutoApproved(def, entityType, entityId, entityRef, amount, currencyCode, initiatedBy);
        }

        List<Map<String, Object>> steps = def.getStepsConfig();
        int totalSteps = steps.size();

        WorkflowInstance instance = WorkflowInstance.builder()
                .workflowCode(def.getWorkflowCode()).entityType(entityType).entityId(entityId)
                .entityRef(entityRef).totalSteps(totalSteps)
                .initiatedBy(initiatedBy).amount(amount).currencyCode(currencyCode)
                .status(WorkflowStatus.PENDING).build();

        if (def.getSlaHours() != null) {
            instance.setSlaDeadline(Instant.now().plus(def.getSlaHours(), ChronoUnit.HOURS));
        }

        // Create step actions
        for (int i = 0; i < steps.size(); i++) {
            Map<String, Object> stepConfig = steps.get(i);
            WorkflowStepAction stepAction = WorkflowStepAction.builder()
                    .stepNumber(i + 1)
                    .stepName((String) stepConfig.getOrDefault("name", "Step " + (i + 1)))
                    .requiredRole((String) stepConfig.get("role"))
                    .status("PENDING").build();
            instance.addStepAction(stepAction);
        }

        WorkflowInstance saved = instanceRepository.save(instance);
        log.info("Workflow initiated: code={}, entity={}/{}, steps={}, sla={}h",
                def.getWorkflowCode(), entityType, entityId, totalSteps, def.getSlaHours());
        return saved;
    }

    @Transactional
    public WorkflowInstance approveStep(Long instanceId, String actionBy, String comments) {
        WorkflowInstance instance = findInstanceOrThrow(instanceId);

        if (instance.getStatus() != WorkflowStatus.PENDING && instance.getStatus() != WorkflowStatus.IN_PROGRESS) {
            throw new BusinessException("Workflow is not in an approvable state", "WORKFLOW_NOT_APPROVABLE");
        }

        WorkflowStepAction currentStep = instance.getStepActions().stream()
                .filter(s -> s.getStepNumber().equals(instance.getCurrentStep()) && "PENDING".equals(s.getStatus()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("No pending step found", "NO_PENDING_STEP"));

        currentStep.setAction("APPROVE");
        currentStep.setActionBy(actionBy);
        currentStep.setActionAt(Instant.now());
        currentStep.setComments(comments);
        currentStep.setStatus("APPROVED");

        instance.advanceStep();
        instance.setUpdatedAt(Instant.now());

        WorkflowInstance saved = instanceRepository.save(instance);
        log.info("Workflow step approved: instance={}, step={}/{}, by={}",
                instanceId, currentStep.getStepNumber(), instance.getTotalSteps(), actionBy);
        return saved;
    }

    @Transactional
    public WorkflowInstance rejectStep(Long instanceId, String actionBy, String comments) {
        WorkflowInstance instance = findInstanceOrThrow(instanceId);

        WorkflowStepAction currentStep = instance.getStepActions().stream()
                .filter(s -> s.getStepNumber().equals(instance.getCurrentStep()) && "PENDING".equals(s.getStatus()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("No pending step found", "NO_PENDING_STEP"));

        currentStep.setAction("REJECT");
        currentStep.setActionBy(actionBy);
        currentStep.setActionAt(Instant.now());
        currentStep.setComments(comments);
        currentStep.setStatus("REJECTED");

        instance.setStatus(WorkflowStatus.REJECTED);
        instance.setCompletedAt(Instant.now());
        instance.setUpdatedAt(Instant.now());

        log.info("Workflow rejected: instance={}, step={}, by={}, reason={}", instanceId, currentStep.getStepNumber(), actionBy, comments);
        return instanceRepository.save(instance);
    }

    @Transactional
    public int checkSlaBreaches() {
        List<WorkflowInstance> breached = instanceRepository.findSlaBreached();
        for (WorkflowInstance instance : breached) {
            instance.setIsSlaBreached(true);
            instanceRepository.save(instance);
        }
        if (!breached.isEmpty()) log.warn("SLA breached for {} workflow instances", breached.size());
        return breached.size();
    }

    public WorkflowInstance getInstance(Long id) { return findInstanceOrThrow(id); }

    public Page<WorkflowInstance> getByStatus(WorkflowStatus status, Pageable pageable) {
        return instanceRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    public Page<WorkflowInstance> getAllInstances(Pageable pageable) {
        return instanceRepository.findAll(pageable);
    }

    @Transactional
    public WorkflowDefinition createDefinition(WorkflowDefinition def) {
        return definitionRepository.save(def);
    }

    public List<WorkflowDefinition> getAllDefinitions() {
        return definitionRepository.findByIsActiveTrueOrderByWorkflowNameAsc();
    }

    private WorkflowInstance findInstanceOrThrow(Long id) {
        return instanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowInstance", "id", id));
    }

    private WorkflowInstance createAutoApproved(WorkflowDefinition def, String entityType, Long entityId,
                                                  String entityRef, BigDecimal amount, String currencyCode, String initiatedBy) {
        WorkflowInstance instance = WorkflowInstance.builder()
                .workflowCode(def.getWorkflowCode()).entityType(entityType).entityId(entityId)
                .entityRef(entityRef).totalSteps(0).currentStep(0)
                .initiatedBy(initiatedBy).amount(amount).currencyCode(currencyCode)
                .status(WorkflowStatus.APPROVED).completedAt(Instant.now()).build();
        return instanceRepository.save(instance);
    }
}
