package com.cbs.dspm.repository;

import com.cbs.dspm.entity.DspmPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DspmPolicyRepository extends JpaRepository<DspmPolicy, Long> {
    Optional<DspmPolicy> findByPolicyCode(String policyCode);
    List<DspmPolicy> findByStatusOrderByPolicyNameAsc(String status);
    List<DspmPolicy> findByPolicyTypeAndStatusOrderByPolicyNameAsc(String policyType, String status);
}
