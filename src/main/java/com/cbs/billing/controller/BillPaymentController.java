package com.cbs.billing.controller;

import com.cbs.billing.entity.*;
import com.cbs.billing.service.BillPaymentService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/bills")
@RequiredArgsConstructor
@Tag(name = "Bill Payments", description = "Biller management and bill payment processing")
public class BillPaymentController {

    private final BillPaymentService billPaymentService;

    @PostMapping("/billers")
    @Operation(summary = "Register a biller")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Biller>> createBiller(@RequestBody Biller biller) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(billPaymentService.createBiller(biller)));
    }

    @GetMapping("/billers")
    @Operation(summary = "List active billers")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Biller>>> getAllBillers() {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getAllActiveBillers()));
    }

    @GetMapping("/billers/category/{category}")
    @Operation(summary = "List billers by category")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Biller>>> getBillersByCategory(@PathVariable BillerCategory category) {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getBillersByCategory(category)));
    }

    @PostMapping("/pay")
    @Operation(summary = "Pay a bill")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<BillPayment>> payBill(
            @RequestParam Long debitAccountId, @RequestParam String billerCode,
            @RequestParam String billerCustomerId,
            @RequestParam(required = false) String billerCustomerName,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                billPaymentService.payBill(debitAccountId, billerCode, billerCustomerId, billerCustomerName, amount)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get bill payment details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<BillPayment>> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getPayment(id)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer bill payment history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<BillPayment>>> getCustomerPayments(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<BillPayment> result = billPaymentService.getCustomerPayments(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
