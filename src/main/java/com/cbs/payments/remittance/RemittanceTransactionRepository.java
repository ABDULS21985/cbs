package com.cbs.payments.remittance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RemittanceTransactionRepository extends JpaRepository<RemittanceTransaction, Long> {
    Optional<RemittanceTransaction> findByRemittanceRef(String ref);
    Page<RemittanceTransaction> findBySenderCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    Page<RemittanceTransaction> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    @Query(value = "SELECT nextval('cbs.remittance_seq')", nativeQuery = true)
    Long getNextRemittanceSequence();
}
