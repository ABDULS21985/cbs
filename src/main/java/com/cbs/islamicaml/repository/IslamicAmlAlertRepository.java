package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.IslamicAmlAlert;
import com.cbs.islamicaml.entity.IslamicAmlAlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
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

    @Query("SELECT COUNT(a) FROM IslamicAmlAlert a WHERE a.createdAt >= :from AND a.createdAt < :to")
    long countByCreatedAtBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(a) FROM IslamicAmlAlert a WHERE a.status = :status AND a.createdAt >= :from AND a.createdAt < :to")
    long countByStatusAndCreatedAtBetween(@Param("status") IslamicAmlAlertStatus status,
                                          @Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT a.ruleCode, COUNT(a) FROM IslamicAmlAlert a WHERE a.createdAt >= :from AND a.createdAt < :to GROUP BY a.ruleCode")
    List<Object[]> countGroupByRuleCode(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(a) FROM IslamicAmlAlert a WHERE a.ruleCode LIKE :ruleCodePattern AND a.createdAt >= :from AND a.createdAt < :to")
    long countByRuleCodeLikeAndCreatedAtBetween(@Param("ruleCodePattern") String ruleCodePattern,
                                                 @Param("from") Instant from, @Param("to") Instant to);
}
