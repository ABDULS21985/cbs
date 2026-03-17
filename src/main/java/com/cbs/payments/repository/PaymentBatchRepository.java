package com.cbs.payments.repository;

import com.cbs.payments.entity.PaymentBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentBatchRepository extends JpaRepository<PaymentBatch, Long> {

    Optional<PaymentBatch> findByBatchRef(String batchRef);

    Page<PaymentBatch> findByDebitAccountId(Long accountId, Pageable pageable);

    @org.springframework.data.jpa.repository.Query(value = "SELECT nextval('cbs.payment_batch_seq')", nativeQuery = true)
    Long getNextBatchSequence();
}
