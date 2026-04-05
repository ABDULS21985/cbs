package com.cbs.tenant.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tenant.entity.Tenant;
import com.cbs.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TenantService {

    private final TenantRepository tenantRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public Tenant createTenant(Tenant tenant) {
        if (!StringUtils.hasText(tenant.getTenantCode())) {
            throw new BusinessException("Tenant code is required", "MISSING_TENANT_CODE");
        }
        if (!StringUtils.hasText(tenant.getTenantName())) {
            throw new BusinessException("Tenant name is required", "MISSING_TENANT_NAME");
        }
        tenantRepository.findByTenantCode(tenant.getTenantCode()).ifPresent(t -> {
            throw new BusinessException("Tenant code exists: " + tenant.getTenantCode(), "DUPLICATE_TENANT");
        });

        // Handle SCHEMA isolation mode: create schema name
        if ("SCHEMA".equals(tenant.getIsolationMode())) {
            if (tenant.getSchemaName() == null) {
                tenant.setSchemaName("tenant_" + tenant.getTenantCode().toLowerCase().replaceAll("[^a-z0-9_]", "_"));
            }
            // Log schema creation requirement (actual DDL should be handled by migration/provisioning system)
            log.info("AUDIT: Schema isolation requested for tenant {}: schema={}",
                    tenant.getTenantCode(), tenant.getSchemaName());
        }

        tenant.setIsActive(true);

        // Initialize branding config with defaults if empty
        if (tenant.getBrandingConfig() == null || tenant.getBrandingConfig().isEmpty()) {
            Map<String, Object> defaults = new HashMap<>();
            defaults.put("multiCurrency", true);
            defaults.put("auditTrail", true);
            defaults.put("twoFactorAuth", false);
            defaults.put("sessionTimeoutMinutes", 30);
            defaults.put("passwordPolicy", "STANDARD");
            tenant.setBrandingConfig(defaults);
        }

        Tenant saved = tenantRepository.save(tenant);
        log.info("AUDIT: Tenant created: code={}, type={}, isolation={}, actor={}",
                tenant.getTenantCode(), tenant.getTenantType(), tenant.getIsolationMode(),
                currentActorProvider.getCurrentActor());
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
        if (!Boolean.TRUE.equals(tenant.getIsActive())) {
            throw new BusinessException("Tenant is already inactive", "TENANT_ALREADY_INACTIVE");
        }
        // Check max users limit as a proxy for active usage
        if (tenant.getMaxUsers() != null && tenant.getMaxUsers() > 0) {
            log.info("AUDIT: Deactivating tenant {} which has maxUsers={} configured. Ensure users are notified.",
                    tenantCode, tenant.getMaxUsers());
        }
        tenant.setIsActive(false);
        tenant.setUpdatedAt(Instant.now());
        Tenant saved = tenantRepository.save(tenant);
        log.info("AUDIT: Tenant deactivated: code={}, actor={}",
                tenantCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public Tenant updateBrandingConfig(String tenantCode, Map<String, Object> config) {
        Tenant tenant = getTenant(tenantCode);
        if (tenant.getBrandingConfig() == null) {
            tenant.setBrandingConfig(new HashMap<>());
        }
        tenant.getBrandingConfig().putAll(config);
        tenant.setUpdatedAt(Instant.now());
        Tenant saved = tenantRepository.save(tenant);
        log.info("AUDIT: Tenant config updated: code={}, keys={}, actor={}",
                tenantCode, config.keySet(), currentActorProvider.getCurrentActor());
        return saved;
    }
}
