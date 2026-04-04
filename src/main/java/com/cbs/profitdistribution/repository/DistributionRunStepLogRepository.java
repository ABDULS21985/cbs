package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.DistributionRunStepLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DistributionRunStepLogRepository extends JpaRepository<DistributionRunStepLog, Long> {

    List<DistributionRunStepLog> findByDistributionRunIdOrderByStepNumberAsc(Long distributionRunId);
}
