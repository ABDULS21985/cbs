package com.cbs.fees.islamic.repository;

import com.cbs.fees.islamic.entity.IslamicFeeWaiver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicFeeWaiverRepository extends JpaRepository<IslamicFeeWaiver, Long> {

    Optional<IslamicFeeWaiver> findByWaiverRef(String waiverRef);

    List<IslamicFeeWaiver> findByStatusOrderByRequestedAtDesc(String status);

    List<IslamicFeeWaiver> findByCustomerIdOrderByRequestedAtDesc(Long customerId);

    List<IslamicFeeWaiver> findByContractIdOrderByRequestedAtDesc(Long contractId);

    List<IslamicFeeWaiver> findByRequestedAtBetweenOrderByRequestedAtDesc(Instant from, Instant to);

    @Query("""
            select w
            from IslamicFeeWaiver w
            where w.feeConfigId = :feeConfigId
              and w.status = 'APPLIED'
              and (:accountId is null or w.accountId = :accountId)
              and (:contractId is null or w.contractId = :contractId)
              and (:customerId is null or w.customerId = :customerId)
            order by w.appliedAt asc, w.requestedAt asc
            """)
    List<IslamicFeeWaiver> findApplicablePreChargeWaivers(Long feeConfigId,
                                                          Long accountId,
                                                          Long contractId,
                                                          Long customerId);
}
