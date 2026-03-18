package com.cbs.workbench.repository;

import com.cbs.workbench.entity.WorkbenchQuickAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkbenchQuickActionRepository extends JpaRepository<WorkbenchQuickAction, Long> {

    Optional<WorkbenchQuickAction> findByActionCode(String actionCode);

    List<WorkbenchQuickAction> findByIsActiveTrueOrderByDisplayOrderAsc();
}
