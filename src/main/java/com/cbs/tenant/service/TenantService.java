package com.cbs.tenant.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tenant.entity.Tenant;
import com.cbs.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TenantService {

    private final TenantRepository tenantRepository;

    @Transactional
    public Tenant createTenant(Tenant tenant) {
        tenantRepository.findByTenantCode(tenant.getTenantCode()).ifPresent(t -> {
            throw new BusinessException("Tenant code exists: " + tenant.getTenantCode(), "DUPLICATE_TENANT");
        });
        if ("SCHEMA".equals(tenant.getIsolationMode()) && tenant.getSchemaName() == null) {
            tenant.setSchemaName("tenant_" + tenant.getTenantCode().toLowerCase());
        }
        Tenant saved = tenantRepository.save(tenant);
        log.info("Tenant created: code={}, type={}, isolation={}", tenant.getTenantCode(), tenant.getTenantType(), tenant.getIsolationMode());
        return saved;
    }

    public Tenant getTenant(String tenantCode) {
        return tenantRepository.findByTenantCode(tenantCode)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", "tenantCode", tenantCode));
    }

    public List<Tenant> getAllActive() { return tenantRepository.findByIsActiveTrueOrderByTenantNameAsc(); }

    @Transactional
    public Tenant deactivate(String tenantCode) {
        Tenant tenant = getTenant(tenantCode);
        tenant.setIsActive(false);
        return tenantRepository.save(tenant);
    }
}
