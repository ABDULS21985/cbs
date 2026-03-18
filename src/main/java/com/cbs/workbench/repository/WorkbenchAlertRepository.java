package com.cbs.workbench.repository;

import com.cbs.workbench.entity.WorkbenchAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkbenchAlertRepository extends JpaRepository<WorkbenchAlert, Long> {

    List<WorkbenchAlert> findBySessionIdAndAcknowledgedFalseOrderByCreatedAtDesc(Long sessionId);

    List<WorkbenchAlert> findBySessionIdOrderByCreatedAtDesc(Long sessionId);
}
