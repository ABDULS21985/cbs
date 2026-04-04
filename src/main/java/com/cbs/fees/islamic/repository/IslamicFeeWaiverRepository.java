package com.cbs.fees.islamic.repository;

import com.cbs.fees.islamic.entity.IslamicFeeWaiver;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
