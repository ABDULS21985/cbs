package com.cbs.dspm.repository;

import com.cbs.dspm.entity.DspmAccessAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DspmAccessAuditRepository extends JpaRepository<DspmAccessAudit, Long> {
    Page<DspmAccessAudit> findByIdentityIdOrderByOccurredAtDesc(Long identityId, Pageable pageable);
    Page<DspmAccessAudit> findBySourceIdOrderByOccurredAtDesc(Long sourceId, Pageable pageable);
    List<DspmAccessAudit> findByRiskFlagTrueOrderByOccurredAtDesc();
    Page<DspmAccessAudit> findByIdentityId(Long identityId, Pageable pageable);
}
