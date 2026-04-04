package com.cbs.gl.islamic.repository;

import com.cbs.gl.islamic.entity.PerTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PerTransactionRepository extends JpaRepository<PerTransaction, Long> {
    List<PerTransaction> findByPoolIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqualOrderByProcessedAtAsc(
            Long poolId, LocalDate from, LocalDate to);
    Optional<PerTransaction> findTopByPoolIdOrderByProcessedAtDesc(Long poolId);
    List<PerTransaction> findByProcessedAtAfterOrderByProcessedAtDesc(Instant processedAt);
}
