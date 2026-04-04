package com.cbs.notification.repository;

import com.cbs.notification.entity.NotificationTemplateLocale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationTemplateLocaleRepository extends JpaRepository<NotificationTemplateLocale, Long> {

    Optional<NotificationTemplateLocale> findByTemplateIdAndLocaleAndTenantId(Long templateId, String locale, Long tenantId);

    Optional<NotificationTemplateLocale> findByTemplateIdAndLocaleAndTenantIdIsNull(Long templateId, String locale);

    List<NotificationTemplateLocale> findByTemplateIdAndTenantIdOrderByIsDefaultDescLocaleAsc(Long templateId, Long tenantId);

    List<NotificationTemplateLocale> findByTemplateIdAndTenantIdIsNullOrderByIsDefaultDescLocaleAsc(Long templateId);

    Optional<NotificationTemplateLocale> findByTemplateIdAndIsDefaultTrueAndTenantId(Long templateId, Long tenantId);

    Optional<NotificationTemplateLocale> findByTemplateIdAndIsDefaultTrueAndTenantIdIsNull(Long templateId);
}
