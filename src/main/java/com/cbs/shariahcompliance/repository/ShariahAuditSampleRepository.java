package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.ComplianceResult;
import com.cbs.shariahcompliance.entity.SampleReviewStatus;
import com.cbs.shariahcompliance.entity.ShariahAuditSample;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShariahAuditSampleRepository extends JpaRepository<ShariahAuditSample, Long> {

    List<ShariahAuditSample> findByAuditId(Long auditId);

    List<ShariahAuditSample> findByAuditIdAndReviewStatus(Long auditId, SampleReviewStatus reviewStatus);

    long countByAuditIdAndComplianceResult(Long auditId, ComplianceResult complianceResult);
}
