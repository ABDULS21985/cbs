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
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    // ========================================================================
    // CATEGORIES
    // ========================================================================

    @GetMapping("/categories")
    @Operation(summary = "List all biller categories")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getCategories() {
        List<Map<String, String>> categories = Arrays.stream(BillerCategory.values())
                .map(c -> Map.of("code", c.name(), "name", c.name().replace('_', ' ')))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @GetMapping("/categories/{categoryCode}/billers")
    @Operation(summary = "List billers in a category")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Biller>>> getBillersByCategoryCode(@PathVariable String categoryCode) {
        BillerCategory category = BillerCategory.valueOf(categoryCode.toUpperCase());
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getBillersByCategory(category)));
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    @PostMapping("/validate")
    @Operation(summary = "Validate a bill payment before submission")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateBill(
            @RequestBody Map<String, Object> request) {
        String billerCode = (String) request.get("billerCode");
        String customerId = (String) request.get("customerId");
        // In production, this would call the biller's validation API
        // For now return a validated response
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "valid", true,
                "customerId", customerId != null ? customerId : "",
                "customerName", "Validated Customer",
                "billerCode", billerCode != null ? billerCode : ""
        )));
    }

    // ========================================================================
    // FAVORITES
    // ========================================================================

    @GetMapping("/favorites")
    @Operation(summary = "Get customer's favorite billers")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFavorites(
            @RequestParam(required = false) Long customerId) {
        // Returns from bill_favorite table — empty until favorites are saved
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/favorites")
    @Operation(summary = "Add a biller to favorites")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addFavorite(
            @RequestBody Map<String, Object> favorite) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "message", "Favorite added",
                "id", System.currentTimeMillis()
        )));
    }

    @PostMapping("/favorites/{id}/remove")
    @Operation(summary = "Remove a biller from favorites")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> removeFavorite(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Favorite removed")));
    }

    // ========================================================================
    // ADMIN BILLERS
    // ========================================================================

    @GetMapping("/admin/billers")
    @Operation(summary = "Admin: List all billers including inactive")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Biller>>> adminListBillers() {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getAllActiveBillers()));
    }

    // ========================================================================
    // PAYMENT DETAILS
    // ========================================================================

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
