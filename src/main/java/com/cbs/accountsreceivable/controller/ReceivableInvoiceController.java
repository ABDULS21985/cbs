package com.cbs.accountsreceivable.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.accountsreceivable.entity.ReceivableInvoice;
import com.cbs.accountsreceivable.service.ReceivableInvoiceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/receivables") @RequiredArgsConstructor
@Tag(name = "Accounts Receivable", description = "Invoice management, payment tracking, overdue management")
public class ReceivableInvoiceController {
    private final ReceivableInvoiceService service;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ReceivableInvoice>> create(@RequestBody ReceivableInvoice invoice) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(invoice)));
    }
    @PostMapping("/{invoiceNumber}/pay") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ReceivableInvoice>> pay(@PathVariable String invoiceNumber, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(service.recordPayment(invoiceNumber, amount)));
    }
    @GetMapping("/overdue") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ReceivableInvoice>>> getOverdue() {
        return ResponseEntity.ok(ApiResponse.ok(service.getOverdue()));
    }
    @PostMapping("/mark-overdue") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> markOverdue() {
        return ResponseEntity.ok(ApiResponse.ok(service.markOverdue()));
    }
    @GetMapping("/customer/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ReceivableInvoice>>> getByCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(id)));
    }
}
