package com.cbs.billing.controller;

import com.cbs.billing.dto.*;
import com.cbs.billing.entity.*;
import com.cbs.billing.service.BillPaymentService;
import com.cbs.common.audit.CurrentCustomerProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.customer.entity.Customer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
@Tag(name = "Bill Payments", description = "Biller management, bill validation, payment processing, favorites, and history")
public class BillPaymentController {

    private final BillPaymentService billPaymentService;
    private final CurrentCustomerProvider currentCustomerProvider;

    // ========================================================================
    // BILLER MANAGEMENT
    // ========================================================================

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
    @Operation(summary = "List billers by category enum")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Biller>>> getBillersByCategory(@PathVariable BillerCategory category) {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getBillersByCategory(category)));
    }

    @GetMapping("/billers/search")
    @Operation(summary = "Search billers by name or code")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Biller>>> searchBillers(@RequestParam("q") String query) {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.searchBillers(query)));
    }

    @GetMapping("/billers/{id}")
    @Operation(summary = "Get biller details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Biller>> getBiller(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getBiller(id)));
    }

    // ========================================================================
    // CATEGORIES
    // ========================================================================

    @GetMapping("/categories")
    @Operation(summary = "List all biller categories with biller counts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCategories() {
        List<Map<String, Object>> categories = Arrays.stream(BillerCategory.values())
                .map(c -> {
                    List<Biller> billers = billPaymentService.getBillersByCategory(c);
                    return Map.<String, Object>of(
                            "code", c.name(),
                            "name", formatCategoryName(c),
                            "icon", c.name().toLowerCase(),
                            "billerCount", billers.size()
                    );
                })
                .filter(m -> (int) m.get("billerCount") > 0 || isCoreCategoryAlwaysShown((String) m.get("code")))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @GetMapping("/categories/{categoryCode}/billers")
    @Operation(summary = "List billers in a category by code")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Biller>>> getBillersByCategoryCode(@PathVariable String categoryCode) {
        BillerCategory category = BillerCategory.valueOf(categoryCode.toUpperCase());
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getBillersByCategory(category)));
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    @PostMapping("/validate")
    @Operation(summary = "Validate a bill customer reference before payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<BillValidationResponseDto>> validateBill(
            @Valid @RequestBody BillValidationRequestDto request) {
        BillValidationResponseDto result = billPaymentService.validateBillReference(
                request.getBillerCode(), request.getCustomerId());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ========================================================================
    // FEE PREVIEW
    // ========================================================================

    @GetMapping("/fee-preview")
    @Operation(summary = "Preview fee and total debit for a bill payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<BillFeePreviewDto>> getFeePreview(
            @RequestParam String billerCode,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.calculateFeePreview(billerCode, amount)));
    }

    // ========================================================================
    // PAYMENT
    // ========================================================================

    @PostMapping("/pay")
    @Operation(summary = "Pay a bill")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<BillPayment>> payBill(@Valid @RequestBody BillPaymentRequestDto request) {
        BillPayment payment = billPaymentService.payBill(
                request.getDebitAccountId(),
                request.getBillerCode(),
                request.getBillerCustomerId(),
                request.getBillerCustomerName(),
                request.getAmount());

        // Update favorite stats if the customer has this biller favorited
        Customer customer = payment.getCustomer();
        billPaymentService.updateFavoriteAfterPayment(
                customer.getId(), request.getBillerCode(),
                request.getBillerCustomerId(), request.getAmount());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(payment));
    }

    // ========================================================================
    // PAYMENT HISTORY
    // ========================================================================

    @GetMapping("/history")
    @Operation(summary = "Get authenticated customer's bill payment history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<BillPaymentHistoryDto>>> getPaymentHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        Customer customer = currentCustomerProvider.getCurrentCustomer();
        List<BillPaymentHistoryDto> history = billPaymentService.getPaymentHistory(
                customer.getId(), PageRequest.of(page, size), status);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get bill payment details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<BillPayment>> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getPayment(id)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer bill payment history (admin)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<BillPayment>>> getCustomerPayments(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<BillPayment> result = billPaymentService.getCustomerPayments(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // FAVORITES
    // ========================================================================

    @GetMapping("/favorites")
    @Operation(summary = "Get authenticated customer's favorite billers")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<BillFavoriteDto>>> getFavorites() {
        Customer customer = currentCustomerProvider.getCurrentCustomer();
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getCustomerFavorites(customer.getId())));
    }

    @PostMapping("/favorites")
    @Operation(summary = "Add a biller to favorites")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<BillFavoriteDto>> addFavorite(
            @Valid @RequestBody BillFavoriteRequestDto request) {
        Customer customer = currentCustomerProvider.getCurrentCustomer();
        BillFavoriteDto saved = billPaymentService.addFavorite(customer, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(saved));
    }

    @PutMapping("/favorites/{id}")
    @Operation(summary = "Update a favorite's alias")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<BillFavoriteDto>> updateFavorite(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Customer customer = currentCustomerProvider.getCurrentCustomer();
        String alias = body.getOrDefault("alias", "");
        BillFavoriteDto updated = billPaymentService.updateFavoriteAlias(customer.getId(), id, alias);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PostMapping("/favorites/{id}/remove")
    @Operation(summary = "Remove a biller from favorites")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> removeFavorite(@PathVariable Long id) {
        Customer customer = currentCustomerProvider.getCurrentCustomer();
        billPaymentService.removeFavorite(customer.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Favorite removed")));
    }

    // ========================================================================
    // ADMIN
    // ========================================================================

    @GetMapping("/admin/billers")
    @Operation(summary = "Admin: List all billers including inactive")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Biller>>> adminListBillers() {
        return ResponseEntity.ok(ApiResponse.ok(billPaymentService.getAllBillers()));
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private String formatCategoryName(BillerCategory category) {
        String raw = category.name().replace('_', ' ');
        return raw.substring(0, 1).toUpperCase() + raw.substring(1).toLowerCase();
    }

    private boolean isCoreCategoryAlwaysShown(String code) {
        return "UTILITY".equals(code) || "TELECOM".equals(code) || "CABLE_TV".equals(code)
                || "INTERNET".equals(code) || "WATER".equals(code);
    }
}
