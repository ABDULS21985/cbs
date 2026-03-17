package com.cbs.tenant.repository;

import com.cbs.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findByTenantCode(String code);
    List<Tenant> findByIsActiveTrueOrderByTenantNameAsc();
}
