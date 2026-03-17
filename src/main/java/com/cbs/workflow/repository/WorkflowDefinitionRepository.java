package com.cbs.workflow.repository;

import com.cbs.workflow.entity.WorkflowDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinition, Long> {
    Optional<WorkflowDefinition> findByWorkflowCode(String workflowCode);
    List<WorkflowDefinition> findByEntityTypeAndTriggerEventAndIsActiveTrue(String entityType, String triggerEvent);
    List<WorkflowDefinition> findByIsActiveTrueOrderByWorkflowNameAsc();
}
