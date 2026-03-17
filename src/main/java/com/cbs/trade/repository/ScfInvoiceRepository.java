package com.cbs.trade.repository;

import com.cbs.trade.entity.ScfInvoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScfInvoiceRepository extends JpaRepository<ScfInvoice, Long> {
    Page<ScfInvoice> findByProgrammeIdOrderByInvoiceDateDesc(Long programmeId, Pageable pageable);
    Page<ScfInvoice> findBySellerIdOrderByInvoiceDateDesc(Long sellerId, Pageable pageable);
    Page<ScfInvoice> findByStatusOrderByDueDateAsc(String status, Pageable pageable);
}
