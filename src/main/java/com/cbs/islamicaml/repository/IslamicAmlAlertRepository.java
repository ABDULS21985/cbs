package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.IslamicAmlAlert;
import com.cbs.islamicaml.entity.IslamicAmlAlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicAmlAlertRepository extends JpaRepository<IslamicAmlAlert, Long>,
        JpaSpecificationExecutor<IslamicAmlAlert> {

    Optional<IslamicAmlAlert> findByAlertRef(String alertRef);

    List<IslamicAmlAlert> findByStatus(IslamicAmlAlertStatus status);

    List<IslamicAmlAlert> findByCustomerId(Long customerId);

    long countByStatus(IslamicAmlAlertStatus status);

    @Query("SELECT a FROM IslamicAmlAlert a WHERE a.status IN (com.cbs.islamicaml.entity.IslamicAmlAlertStatus.NEW, com.cbs.islamicaml.entity.IslamicAmlAlertStatus.UNDER_INVESTIGATION) AND a.slaDeadline < CURRENT_TIMESTAMP")
    List<IslamicAmlAlert> findOverdueAlerts();

    long countByRuleCode(String ruleCode);
}
