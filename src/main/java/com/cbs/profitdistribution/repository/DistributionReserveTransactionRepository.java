package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.DistributionReserveTransaction;
import com.cbs.profitdistribution.entity.DistributionReserveType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DistributionReserveTransactionRepository extends JpaRepository<DistributionReserveTransaction, Long> {

    List<DistributionReserveTransaction> findByDistributionRunId(Long distributionRunId);

    List<DistributionReserveTransaction> findByDistributionRunIdAndReserveType(Long distributionRunId, DistributionReserveType reserveType);
}
