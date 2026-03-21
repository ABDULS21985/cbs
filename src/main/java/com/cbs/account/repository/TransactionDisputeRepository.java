package com.cbs.account.repository;

import com.cbs.account.entity.TransactionDispute;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionDisputeRepository extends JpaRepository<TransactionDispute, Long> {

    Optional<TransactionDispute> findTopByTransactionIdOrderByFiledAtDesc(Long transactionId);

    Page<TransactionDispute> findByCustomerIdOrderByLastUpdatedAtDesc(Long customerId, Pageable pageable);

    Page<TransactionDispute> findByCustomerIdAndStatusOrderByLastUpdatedAtDesc(Long customerId, String status, Pageable pageable);

    Page<TransactionDispute> findByStatusOrderByLastUpdatedAtDesc(String status, Pageable pageable);

    Page<TransactionDispute> findAllByOrderByLastUpdatedAtDesc(Pageable pageable);

    long countByStatus(String status);

    long countByCustomerIdAndStatus(Long customerId, String status);

    @Query(value = "SELECT nextval('cbs.transaction_dispute_ref_seq')", nativeQuery = true)
    Long nextDisputeSequence();

    List<TransactionDispute> findByTransactionIdOrderByFiledAtDesc(Long transactionId);
}
