package com.cbs.accountsreceivable.repository;

import com.cbs.accountsreceivable.entity.ReceivableInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ReceivableInvoiceRepository extends JpaRepository<ReceivableInvoice, Long> {
    Optional<ReceivableInvoice> findByInvoiceNumber(String invoiceNumber);
    List<ReceivableInvoice> findByCustomerIdAndStatusOrderByDueDateAsc(Long customerId, String status);
    List<ReceivableInvoice> findByCustomerIdOrderByDueDateDesc(Long customerId);
    List<ReceivableInvoice> findByStatusOrderByDueDateAsc(String status);
    @Query("SELECT r FROM ReceivableInvoice r WHERE r.status IN ('ISSUED','PARTIALLY_PAID') AND r.dueDate < CURRENT_DATE")
    List<ReceivableInvoice> findOverdue();
}
