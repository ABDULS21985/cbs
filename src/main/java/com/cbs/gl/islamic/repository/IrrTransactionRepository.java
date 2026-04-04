package com.cbs.gl.islamic.repository;

import com.cbs.gl.islamic.entity.IrrTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IrrTransactionRepository extends JpaRepository<IrrTransaction, Long> {
    List<IrrTransaction> findByPoolIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqualOrderByProcessedAtAsc(
            Long poolId, LocalDate from, LocalDate to);
    Optional<IrrTransaction> findTopByPoolIdOrderByProcessedAtDesc(Long poolId);
    List<IrrTransaction> findByProcessedAtAfterOrderByProcessedAtDesc(Instant processedAt);
}
