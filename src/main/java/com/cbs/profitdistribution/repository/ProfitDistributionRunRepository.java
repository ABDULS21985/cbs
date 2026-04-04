package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.DistributionRunStatus;
import com.cbs.profitdistribution.entity.ProfitDistributionRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProfitDistributionRunRepository extends JpaRepository<ProfitDistributionRun, Long> {

    Optional<ProfitDistributionRun> findByRunRef(String runRef);

    Optional<ProfitDistributionRun> findByPoolIdAndPeriodFromAndPeriodTo(Long poolId, LocalDate periodFrom, LocalDate periodTo);

    List<ProfitDistributionRun> findByPoolIdAndStatus(Long poolId, DistributionRunStatus status);

    List<ProfitDistributionRun> findByPoolIdOrderByPeriodFromDesc(Long poolId);

    List<ProfitDistributionRun> findByStatus(DistributionRunStatus status);

    Optional<ProfitDistributionRun> findTopByPoolIdAndStatusOrderByCompletedAtDesc(Long poolId, DistributionRunStatus status);

    Optional<ProfitDistributionRun> findTopByAllocationBatchIdOrderByCreatedAtDesc(Long allocationBatchId);

    List<ProfitDistributionRun> findByDistributedAtBetween(LocalDateTime start, LocalDateTime end);
}
