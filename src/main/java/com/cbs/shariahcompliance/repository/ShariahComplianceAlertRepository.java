package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.AlertStatus;
import com.cbs.shariahcompliance.entity.AlertType;
import com.cbs.shariahcompliance.entity.ScreeningSeverity;
import com.cbs.shariahcompliance.entity.ShariahComplianceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShariahComplianceAlertRepository extends JpaRepository<ShariahComplianceAlert, Long>,
        JpaSpecificationExecutor<ShariahComplianceAlert> {

    Optional<ShariahComplianceAlert> findByAlertRef(String alertRef);

    List<ShariahComplianceAlert> findByStatus(AlertStatus status);

    @Query("SELECT a FROM ShariahComplianceAlert a WHERE a.status IN ('NEW', 'UNDER_REVIEW') AND a.slaDeadline < CURRENT_TIMESTAMP")
    List<ShariahComplianceAlert> findOverdueAlerts();

    long countByStatus(AlertStatus status);

    long countBySeverity(ScreeningSeverity severity);

    long countByAlertType(AlertType alertType);
}
