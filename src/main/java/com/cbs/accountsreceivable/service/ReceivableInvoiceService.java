package com.cbs.accountsreceivable.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.accountsreceivable.entity.ReceivableInvoice;
import com.cbs.accountsreceivable.repository.ReceivableInvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ReceivableInvoiceService {
    private final ReceivableInvoiceRepository repository;

    @Transactional
    public ReceivableInvoice create(ReceivableInvoice invoice) {
        invoice.setInvoiceNumber("INV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        invoice.setOutstandingAmount(invoice.getNetAmount());
        invoice.setStatus("ISSUED");
        return repository.save(invoice);
    }

    @Transactional
    public ReceivableInvoice recordPayment(String invoiceNumber, BigDecimal amount) {
        ReceivableInvoice inv = getByNumber(invoiceNumber);
        if ("PAID".equals(inv.getStatus())) {
            throw new BusinessException("Invoice " + invoiceNumber + " is already PAID");
        }
        inv.setPaidAmount(inv.getPaidAmount().add(amount));
        inv.setOutstandingAmount(inv.getNetAmount().subtract(inv.getPaidAmount()));
        if (inv.getOutstandingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            inv.setOutstandingAmount(BigDecimal.ZERO);
            inv.setStatus("PAID");
            inv.setPaidAt(Instant.now());
        } else {
            inv.setStatus("PARTIALLY_PAID");
        }
        return repository.save(inv);
    }

    public List<ReceivableInvoice> getOverdue() {
        return repository.findOverdue();
    }

    @Transactional
    public int markOverdue() {
        List<ReceivableInvoice> overdue = repository.findOverdue();
        int count = 0;
        for (ReceivableInvoice inv : overdue) {
            inv.setStatus("OVERDUE");
            inv.setOverdueDays((int) ChronoUnit.DAYS.between(inv.getDueDate(), LocalDate.now()));
            repository.save(inv);
            count++;
        }
        return count;
    }

    public List<ReceivableInvoice> getByCustomer(Long customerId) {
        return repository.findByCustomerIdOrderByDueDateDesc(customerId);
    }

    public ReceivableInvoice getByNumber(String invoiceNumber) {
        return repository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new ResourceNotFoundException("ReceivableInvoice", "invoiceNumber", invoiceNumber));
    }
}
