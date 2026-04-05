package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.CombinedScreeningAuditLog;
import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface CombinedScreeningAuditLogRepository extends JpaRepository<CombinedScreeningAuditLog, Long> {

    long countByOutcome(CombinedScreeningOutcome outcome);

    @Query("SELECT COUNT(a) FROM CombinedScreeningAuditLog a WHERE a.outcome = :outcome AND a.createdAt >= :from AND a.createdAt < :to")
    long countByOutcomeAndCreatedAtBetween(@Param("outcome") CombinedScreeningOutcome outcome,
                                            @Param("from") Instant from, @Param("to") Instant to);
}
