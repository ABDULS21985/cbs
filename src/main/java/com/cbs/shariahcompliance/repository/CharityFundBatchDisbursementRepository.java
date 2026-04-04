package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.CharityFundBatchDisbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CharityFundBatchDisbursementRepository extends JpaRepository<CharityFundBatchDisbursement, Long> {

    Optional<CharityFundBatchDisbursement> findByBatchRef(String batchRef);

    List<CharityFundBatchDisbursement> findByStatusOrderByCreatedAtDesc(String status);
}
