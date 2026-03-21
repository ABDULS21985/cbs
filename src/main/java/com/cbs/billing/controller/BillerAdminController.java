package com.cbs.billing.controller;

import com.cbs.billing.entity.Biller;
import com.cbs.billing.service.BillPaymentService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/billers")
@RequiredArgsConstructor
@Tag(name = "Biller Admin", description = "Administrative biller management")
public class BillerAdminController {

    private final BillPaymentService billPaymentService;

    @GetMapping
    @Operation(summary = "List all billers including inactive")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Biller>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getAllBillers()));
    }

    @PostMapping
    @Operation(summary = "Create a new biller")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Biller>> create(@RequestBody Biller biller) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(billPaymentService.createBiller(biller)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a biller")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Biller>> update(@PathVariable Long id, @RequestBody Biller biller) {
        biller.setId(id);
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.updateBiller(id, biller)));
    }
}
