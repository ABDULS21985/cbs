package com.cbs.billing.repository;

import com.cbs.billing.entity.BillPayment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BillPaymentRepository extends JpaRepository<BillPayment, Long> {
    Optional<BillPayment> findByPaymentRef(String paymentRef);
    Page<BillPayment> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    Page<BillPayment> findByDebitAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);
}
