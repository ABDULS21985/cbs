package com.cbs.governance.repository;

import com.cbs.governance.entity.ParameterAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ParameterAuditRepository extends JpaRepository<ParameterAudit, Long> {
    List<ParameterAudit> findByParameterIdOrderByCreatedAtDesc(Long parameterId);
}
