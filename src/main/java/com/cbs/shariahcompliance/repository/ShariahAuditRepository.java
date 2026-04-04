package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.ShariahAudit;
import com.cbs.shariahcompliance.entity.ShariahAuditStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShariahAuditRepository extends JpaRepository<ShariahAudit, Long> {

    Optional<ShariahAudit> findByAuditRef(String auditRef);

    List<ShariahAudit> findByStatus(ShariahAuditStatus status);

    Optional<ShariahAudit> findTopByOrderByPeriodToDesc();
}
