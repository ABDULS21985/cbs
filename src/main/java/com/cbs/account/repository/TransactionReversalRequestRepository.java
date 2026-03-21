package com.cbs.account.repository;

import com.cbs.account.entity.TransactionReversalRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionReversalRequestRepository extends JpaRepository<TransactionReversalRequest, Long> {

    Optional<TransactionReversalRequest> findByRequestRef(String requestRef);

    Optional<TransactionReversalRequest> findTopByTransactionIdOrderByRequestedAtDesc(Long transactionId);

    Page<TransactionReversalRequest> findByRequestedByOrderByRequestedAtDesc(String requestedBy, Pageable pageable);

    Page<TransactionReversalRequest> findByRequestedByAndStatusOrderByRequestedAtDesc(String requestedBy, String status, Pageable pageable);

    Page<TransactionReversalRequest> findByStatusOrderByRequestedAtDesc(String status, Pageable pageable);

    Page<TransactionReversalRequest> findAllByOrderByRequestedAtDesc(Pageable pageable);

    long countByStatus(String status);

    @Query(value = "SELECT nextval('cbs.transaction_reversal_req_seq')", nativeQuery = true)
    Long nextRequestSequence();
}
