package com.cbs.workflow;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.workflow.entity.*;
import com.cbs.workflow.repository.*;
import com.cbs.workflow.service.WorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceTest {

    @Mock private WorkflowDefinitionRepository definitionRepository;
    @Mock private WorkflowInstanceRepository instanceRepository;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private WorkflowService workflowService;

    private WorkflowDefinition twoStepDef;

    @BeforeEach
    void setUp() {
        when(currentActorProvider.getCurrentActor()).thenReturn("officer1");
        twoStepDef = WorkflowDefinition.builder()
                .id(1L).workflowCode("LOAN_APPROVAL").workflowName("Loan Approval")
                .entityType("LOAN_APPLICATION").triggerEvent("LOAN_SUBMITTED")
                .stepsConfig(List.of(
                        Map.of("name", "Officer Review", "role", "CBS_OFFICER"),
                        Map.of("name", "Manager Approval", "role", "CBS_ADMIN")))
                .autoApproveBelow(new BigDecimal("10000")).slaHours(24)
                .isActive(true).build();
    }

    @Test
    @DisplayName("Should initiate workflow with correct steps")
    void initiate_Success() {
        when(definitionRepository.findByEntityTypeAndTriggerEventAndIsActiveTrue("LOAN_APPLICATION", "LOAN_SUBMITTED"))
                .thenReturn(List.of(twoStepDef));
        when(instanceRepository.save(any())).thenAnswer(inv -> { WorkflowInstance w = inv.getArgument(0); w.setId(1L); return w; });

        WorkflowInstance result = workflowService.initiateWorkflow("LOAN_APPLICATION", "LOAN_SUBMITTED",
                100L, "LA000000500001", new BigDecimal("50000"), "USD");

        assertThat(result.getStatus()).isEqualTo(WorkflowStatus.PENDING);
        assertThat(result.getTotalSteps()).isEqualTo(2);
        assertThat(result.getCurrentStep()).isEqualTo(1);
        assertThat(result.getSlaDeadline()).isNotNull();
    }

    @Test
    @DisplayName("Should auto-approve when amount below threshold")
    void initiate_AutoApprove() {
        when(definitionRepository.findByEntityTypeAndTriggerEventAndIsActiveTrue("LOAN_APPLICATION", "LOAN_SUBMITTED"))
                .thenReturn(List.of(twoStepDef));
        when(instanceRepository.save(any())).thenAnswer(inv -> { WorkflowInstance w = inv.getArgument(0); w.setId(2L); return w; });

        WorkflowInstance result = workflowService.initiateWorkflow("LOAN_APPLICATION", "LOAN_SUBMITTED",
                101L, "LA000000500002", new BigDecimal("5000"), "USD");

        assertThat(result.getStatus()).isEqualTo(WorkflowStatus.APPROVED);
        assertThat(result.getTotalSteps()).isEqualTo(0);
    }

    @Test
    @DisplayName("Should approve step and advance to next")
    void approveStep_AdvancesToNext() {
        WorkflowInstance instance = WorkflowInstance.builder()
                .id(1L).workflowCode("LOAN_APPROVAL").entityType("LOAN_APPLICATION").entityId(100L)
                .currentStep(1).totalSteps(2).status(WorkflowStatus.PENDING)
                .initiatedBy("officer1").build();

        WorkflowStepAction step1 = WorkflowStepAction.builder()
                .stepNumber(1).stepName("Officer Review").requiredRole("CBS_OFFICER").status("PENDING").build();
        step1.setInstance(instance);
        instance.setStepActions(new java.util.ArrayList<>(List.of(step1)));

        when(instanceRepository.findById(1L)).thenReturn(Optional.of(instance));
        when(instanceRepository.save(any())).thenReturn(instance);

        when(currentActorProvider.getCurrentActor()).thenReturn("officer2");
        WorkflowInstance result = workflowService.approveStep(1L, "Looks good");

        assertThat(result.getCurrentStep()).isEqualTo(2);
        assertThat(result.getStatus()).isEqualTo(WorkflowStatus.IN_PROGRESS);
        assertThat(step1.getStatus()).isEqualTo("APPROVED");
    }

    @Test
    @DisplayName("Should approve final step and complete workflow")
    void approveStep_CompletesWorkflow() {
        WorkflowInstance instance = WorkflowInstance.builder()
                .id(2L).workflowCode("LOAN_APPROVAL").entityType("LOAN_APPLICATION").entityId(101L)
                .currentStep(2).totalSteps(2).status(WorkflowStatus.IN_PROGRESS)
                .initiatedBy("officer1").build();

        WorkflowStepAction step2 = WorkflowStepAction.builder()
                .stepNumber(2).stepName("Manager Approval").requiredRole("CBS_ADMIN").status("PENDING").build();
        step2.setInstance(instance);
        instance.setStepActions(new java.util.ArrayList<>(List.of(step2)));

        when(instanceRepository.findById(2L)).thenReturn(Optional.of(instance));
        when(instanceRepository.save(any())).thenReturn(instance);

        when(currentActorProvider.getCurrentActor()).thenReturn("manager1");
        WorkflowInstance result = workflowService.approveStep(2L, "Approved");

        assertThat(result.getStatus()).isEqualTo(WorkflowStatus.APPROVED);
        assertThat(result.getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should reject workflow and stop processing")
    void rejectStep() {
        WorkflowInstance instance = WorkflowInstance.builder()
                .id(3L).workflowCode("LOAN_APPROVAL").entityType("LOAN_APPLICATION").entityId(102L)
                .currentStep(1).totalSteps(2).status(WorkflowStatus.PENDING)
                .initiatedBy("officer1").build();

        WorkflowStepAction step1 = WorkflowStepAction.builder()
                .stepNumber(1).stepName("Officer Review").status("PENDING").build();
        step1.setInstance(instance);
        instance.setStepActions(new java.util.ArrayList<>(List.of(step1)));

        when(instanceRepository.findById(3L)).thenReturn(Optional.of(instance));
        when(instanceRepository.save(any())).thenReturn(instance);

        when(currentActorProvider.getCurrentActor()).thenReturn("officer2");
        WorkflowInstance result = workflowService.rejectStep(3L, "Incomplete documentation");

        assertThat(result.getStatus()).isEqualTo(WorkflowStatus.REJECTED);
    }

    @Test
    @DisplayName("Should return null when no workflow defined")
    void initiate_NoWorkflowDefined() {
        when(definitionRepository.findByEntityTypeAndTriggerEventAndIsActiveTrue("PAYMENT", "TRANSFER"))
                .thenReturn(List.of());

        WorkflowInstance result = workflowService.initiateWorkflow("PAYMENT", "TRANSFER",
                200L, "TRF001", new BigDecimal("1000"), "USD");

        assertThat(result).isNull();
    }
}
