package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.FindingSeverity;
import com.cbs.shariahcompliance.entity.RemediationStatus;
import com.cbs.shariahcompliance.entity.ShariahAuditFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShariahAuditFindingRepository extends JpaRepository<ShariahAuditFinding, Long> {

    List<ShariahAuditFinding> findByAuditId(Long auditId);

    Optional<ShariahAuditFinding> findByFindingRef(String findingRef);

    List<ShariahAuditFinding> findByRemediationStatus(RemediationStatus remediationStatus);

    @Query("SELECT f FROM ShariahAuditFinding f WHERE f.remediationStatus IN ('OPEN', 'IN_PROGRESS') AND f.remediationDueDate < CURRENT_DATE")
    List<ShariahAuditFinding> findOverdueRemediations();

    long countByAuditIdAndSeverity(@Param("auditId") Long auditId, @Param("severity") FindingSeverity severity);

    long countByRemediationStatus(RemediationStatus remediationStatus);

    @Query("SELECT COUNT(f) FROM ShariahAuditFinding f WHERE f.remediationStatus IN ('OPEN', 'IN_PROGRESS') AND f.remediationDueDate < CURRENT_DATE")
    long countOverdueRemediations();

    Optional<ShariahAuditFinding> findByAuditIdAndSampleId(Long auditId, Long sampleId);
}
