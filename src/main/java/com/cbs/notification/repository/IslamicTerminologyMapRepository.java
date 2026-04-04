package com.cbs.notification.repository;

import com.cbs.notification.entity.IslamicTerminologyMap;
import com.cbs.notification.entity.TerminologyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicTerminologyMapRepository extends JpaRepository<IslamicTerminologyMap, Long> {

    Optional<IslamicTerminologyMap> findByConventionalTermAndContextAndTenantId(
            String conventionalTerm, String context, Long tenantId);

    Optional<IslamicTerminologyMap> findByConventionalTermAndContextAndTenantIdIsNull(
            String conventionalTerm, String context);

    List<IslamicTerminologyMap> findByContextAndStatusAndTenantIdOrderByConventionalTermAsc(
            String context, TerminologyStatus status, Long tenantId);

    List<IslamicTerminologyMap> findByContextAndStatusAndTenantIdIsNullOrderByConventionalTermAsc(
            String context, TerminologyStatus status);

    List<IslamicTerminologyMap> findByStatusAndTenantIdOrderByContextAscConventionalTermAsc(
            TerminologyStatus status, Long tenantId);

    List<IslamicTerminologyMap> findByStatusAndTenantIdIsNullOrderByContextAscConventionalTermAsc(
            TerminologyStatus status);
}
