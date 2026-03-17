package com.cbs.workflow.repository;

import com.cbs.workflow.entity.WorkflowInstance;
import com.cbs.workflow.entity.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {
    Optional<WorkflowInstance> findByEntityTypeAndEntityIdAndStatusIn(String entityType, Long entityId, List<WorkflowStatus> statuses);
    Page<WorkflowInstance> findByStatusOrderByCreatedAtDesc(WorkflowStatus status, Pageable pageable);
    @Query("SELECT w FROM WorkflowInstance w WHERE w.slaDeadline < CURRENT_TIMESTAMP AND w.isSlaBreached = false AND w.status IN ('PENDING','IN_PROGRESS')")
    List<WorkflowInstance> findSlaBreached();
    long countByStatus(WorkflowStatus status);
}
