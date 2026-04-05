package com.cbs.portal.islamic.repository;

import com.cbs.portal.islamic.entity.IslamicPortalConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface IslamicPortalConfigRepository extends JpaRepository<IslamicPortalConfig, Long> {
    Optional<IslamicPortalConfig> findByTenantId(Long tenantId);
    Optional<IslamicPortalConfig> findByTenantIdIsNull();
}
