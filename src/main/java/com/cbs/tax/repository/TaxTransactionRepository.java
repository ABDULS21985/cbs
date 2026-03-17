package com.cbs.tax.repository;

import com.cbs.tax.entity.TaxTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaxTransactionRepository extends JpaRepository<TaxTransaction, Long> {
    Page<TaxTransaction> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);
    Page<TaxTransaction> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<TaxTransaction> findByTaxCodeOrderByCreatedAtDesc(String taxCode, Pageable pageable);
}
