package com.cbs.accountsreceivable.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.accountsreceivable.entity.ReceivableInvoice;
import com.cbs.accountsreceivable.repository.ReceivableInvoiceRepository;
import com.cbs.gl.service.GeneralLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;

    @Value("${cbs.ar.gl.receivable:1200-AR-001}")
    private String accountsReceivableGlCode;

    @Value("${cbs.ar.gl.revenue:4100-AR-001}")
    private String revenueGlCode;

    @Value("${cbs.ar.gl.cash:1001-AR-001}")
    private String cashGlCode;

    @Transactional
    public ReceivableInvoice create(ReceivableInvoice invoice) {
        // Validate required fields
        if (invoice.getNetAmount() == null || invoice.getNetAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Net amount must be greater than zero", "INVALID_NET_AMOUNT");
        }
        if (invoice.getDueDate() == null) {
            throw new BusinessException("Due date is required", "MISSING_DUE_DATE");
        }
        if (invoice.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required", "MISSING_CUSTOMER_ID");
        }

        invoice.setInvoiceNumber("INV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        invoice.setOutstandingAmount(invoice.getNetAmount());
        invoice.setStatus("ISSUED");
        ReceivableInvoice saved = repository.save(invoice);

        // GL posting: Debit Accounts Receivable, Credit Revenue
        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        accountsReceivableGlCode, saved.getNetAmount(), BigDecimal.ZERO,
                        saved.getCurrency(), BigDecimal.ONE,
                        "AR Invoice " + saved.getInvoiceNumber(),
                        null, null, null, saved.getCustomerId()),
                new GeneralLedgerService.JournalLineRequest(
                        revenueGlCode, BigDecimal.ZERO, saved.getNetAmount(),
                        saved.getCurrency(), BigDecimal.ONE,
                        "Revenue - Invoice " + saved.getInvoiceNumber(),
                        null, null, null, saved.getCustomerId())
        );

        generalLedgerService.postJournal(
                "AR_INVOICE",
                "Accounts Receivable invoice issued: " + saved.getInvoiceNumber(),
                "ACCOUNTS_RECEIVABLE",
                saved.getInvoiceNumber(),
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        log.info("Receivable invoice created: number={}, customer={}, amount={} {}, dueDate={}",
                saved.getInvoiceNumber(), saved.getCustomerId(), saved.getNetAmount(),
                saved.getCurrency(), saved.getDueDate());
        return saved;
    }

    @Transactional
    public ReceivableInvoice recordPayment(String invoiceNumber, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Payment amount must be greater than zero", "INVALID_PAYMENT_AMOUNT");
        }

        ReceivableInvoice inv = getByNumber(invoiceNumber);
        if ("PAID".equals(inv.getStatus())) {
            throw new BusinessException("Invoice " + invoiceNumber + " is already PAID");
        }
        if (amount.compareTo(inv.getOutstandingAmount()) > 0) {
            throw new BusinessException("Payment amount exceeds outstanding balance", "PAYMENT_EXCEEDS_OUTSTANDING");
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
        ReceivableInvoice saved = repository.save(inv);

        // GL posting: Debit Cash, Credit Accounts Receivable
        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        cashGlCode, amount, BigDecimal.ZERO,
                        inv.getCurrency(), BigDecimal.ONE,
                        "Payment received - Invoice " + invoiceNumber,
                        null, null, null, inv.getCustomerId()),
                new GeneralLedgerService.JournalLineRequest(
                        accountsReceivableGlCode, BigDecimal.ZERO, amount,
                        inv.getCurrency(), BigDecimal.ONE,
                        "AR reduction - Invoice " + invoiceNumber,
                        null, null, null, inv.getCustomerId())
        );

        generalLedgerService.postJournal(
                "AR_PAYMENT",
                "Payment received for invoice: " + invoiceNumber,
                "ACCOUNTS_RECEIVABLE",
                invoiceNumber + ":PMT",
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        log.info("Payment recorded: invoice={}, amount={}, outstanding={}, status={}",
                invoiceNumber, amount, saved.getOutstandingAmount(), saved.getStatus());
        return saved;
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
