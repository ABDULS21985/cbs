package com.cbs.wadiah.repository;

import com.cbs.wadiah.entity.HibahPolicy;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HibahPolicyRepository extends JpaRepository<HibahPolicy, Long> {

    Optional<HibahPolicy> findByPolicyCode(String policyCode);

    Optional<HibahPolicy> findFirstByStatusAndTenantIdOrderByCreatedAtDesc(
            WadiahDomainEnums.HibahPolicyStatus status,
            Long tenantId);

    List<HibahPolicy> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
}
