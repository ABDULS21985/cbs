package com.cbs.account.repository;

import com.cbs.account.entity.TransactionReversalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionReversalRequestRepository extends JpaRepository<TransactionReversalRequest, Long> {

    Optional<TransactionReversalRequest> findByRequestRef(String requestRef);

    Optional<TransactionReversalRequest> findTopByTransactionIdOrderByRequestedAtDesc(Long transactionId);

    @Query(value = "SELECT nextval('cbs.transaction_reversal_req_seq')", nativeQuery = true)
    Long nextRequestSequence();
}
