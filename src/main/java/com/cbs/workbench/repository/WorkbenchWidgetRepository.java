package com.cbs.workbench.repository;

import com.cbs.workbench.entity.WorkbenchWidget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkbenchWidgetRepository extends JpaRepository<WorkbenchWidget, Long> {

    Optional<WorkbenchWidget> findByWidgetCode(String widgetCode);

    List<WorkbenchWidget> findByStatusOrderByDisplayOrderAsc(String status);
}
