package com.cbs.payroll.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.payroll.entity.*;
import com.cbs.payroll.service.PayrollService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/payroll") @RequiredArgsConstructor
@Tag(name = "Corporate Payroll", description = "Batch payroll processing — validation, approval, disbursement, statutory deductions")
public class PayrollController {
    private final PayrollService payrollService;

    @GetMapping("/batches") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PayrollBatch>>> listBatches() {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getAllBatches()));
    }
    @PostMapping("/batches") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PayrollBatch>> create(@RequestBody PayrollBatch batch) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(payrollService.createBatch(batch, List.of())));
    }
    @PostMapping("/batches/{batchId}/validate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PayrollBatch>> validate(@PathVariable String batchId) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.validate(batchId)));
    }
    @PostMapping("/batches/{batchId}/approve") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollBatch>> approve(@PathVariable String batchId) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.approve(batchId)));
    }
    @PostMapping("/batches/{batchId}/process") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PayrollBatch>> process(@PathVariable String batchId) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.process(batchId)));
    }
    @GetMapping("/batches/{batchId}/items") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PayrollItem>>> getItems(@PathVariable String batchId) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getItems(batchId)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PayrollBatch>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(payrollService.getByCustomer(customerId)));
    }
}
