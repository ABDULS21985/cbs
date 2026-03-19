package com.cbs.portal.controller;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.customer.dto.CustomerResponse;
import com.cbs.portal.dto.PortalDashboardResponse;
import com.cbs.portal.dto.ProfileUpdateRequestDto;
import com.cbs.portal.service.PortalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/portal")
@RequiredArgsConstructor
@Tag(name = "Self-Service Portal", description = "Customer-facing portal for balance, statements, profile updates, disputes")
public class PortalController {

    private final PortalService portalService;

    // ========================================================================
    // DASHBOARD
    // ========================================================================

    @GetMapping("/dashboard/{customerId}")
    @Operation(summary = "Get customer portal dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<PortalDashboardResponse>> getDashboard(
            @PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getDashboard(customerId)));
    }

    // ========================================================================
    // PROFILE
    // ========================================================================

    @GetMapping("/profile/{customerId}")
    @Operation(summary = "Get own customer profile")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> getMyProfile(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getMyProfile(customerId)));
    }

    // ========================================================================
    // BALANCE & STATEMENTS
    // ========================================================================

    @GetMapping("/{customerId}/accounts/{accountNumber}/balance")
    @Operation(summary = "Get account balance (self-service)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<AccountResponse>> getBalance(
            @PathVariable Long customerId,
            @PathVariable String accountNumber) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getAccountBalance(customerId, accountNumber)));
    }

    @GetMapping("/{customerId}/accounts/{accountNumber}/mini-statement")
    @Operation(summary = "Get mini statement (last N transactions)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getMiniStatement(
            @PathVariable Long customerId,
            @PathVariable String accountNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<TransactionResponse> result = portalService.getMiniStatement(customerId, accountNumber,
                PageRequest.of(page, Math.min(size, 50), Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/{customerId}/accounts/{accountNumber}/statement")
    @Operation(summary = "Get full statement for date range")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getFullStatement(
            @PathVariable Long customerId,
            @PathVariable String accountNumber,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<TransactionResponse> result = portalService.getFullStatement(customerId, accountNumber, from, to,
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // PROFILE UPDATE REQUESTS (maker-checker)
    // ========================================================================

    @PostMapping("/{customerId}/profile-updates")
    @Operation(summary = "Submit a profile update request")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ProfileUpdateRequestDto>> submitProfileUpdate(
            @PathVariable Long customerId,
            @Valid @RequestBody ProfileUpdateRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(portalService.submitProfileUpdate(customerId, request),
                        "Profile update request submitted"));
    }

    @GetMapping("/{customerId}/profile-updates")
    @Operation(summary = "Get my profile update requests")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<ProfileUpdateRequestDto>>> getMyUpdates(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ProfileUpdateRequestDto> result = portalService.getMyProfileUpdateRequests(customerId,
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // Back-office endpoints
    @GetMapping("/admin/profile-updates/pending")
    @Operation(summary = "Get pending profile update requests (back-office)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProfileUpdateRequestDto>>> getPendingUpdates(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ProfileUpdateRequestDto> result = portalService.getPendingProfileUpdates(
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/admin/profile-updates/{requestId}/approve")
    @Operation(summary = "Approve a profile update request")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ProfileUpdateRequestDto>> approveUpdate(
            @PathVariable Long requestId,
            @RequestParam String reviewedBy) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.approveProfileUpdate(requestId, reviewedBy)));
    }

    @PostMapping("/admin/profile-updates/{requestId}/reject")
    @Operation(summary = "Reject a profile update request")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ProfileUpdateRequestDto>> rejectUpdate(
            @PathVariable Long requestId,
            @RequestParam String reviewedBy,
            @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.rejectProfileUpdate(requestId, reviewedBy, reason)));
    }

    // ========================================================================
    // SELF-SERVICE: ACCOUNTS & TRANSACTIONS
    // ========================================================================

    @GetMapping("/accounts")
    @Operation(summary = "Get authenticated customer's accounts")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyAccounts() {
        // Would use SecurityContext to get authenticated customer
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/accounts/{accountId}/transactions")
    @Operation(summary = "Get transactions for a specific account")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTransactions(
            @PathVariable Long accountId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/transactions/recent")
    @Operation(summary = "Get recent transactions across all accounts")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRecentTransactions() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    // ========================================================================
    // SELF-SERVICE: BENEFICIARIES
    // ========================================================================

    @GetMapping("/beneficiaries")
    @Operation(summary = "List saved beneficiaries")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBeneficiaries() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/beneficiaries")
    @Operation(summary = "Add a new beneficiary")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addBeneficiary(@RequestBody Map<String, Object> data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @DeleteMapping("/beneficiaries/{id}")
    @Operation(summary = "Remove a beneficiary")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeBeneficiary(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // SELF-SERVICE: CARDS
    // ========================================================================

    @GetMapping("/cards")
    @Operation(summary = "Get authenticated customer's cards")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyCards() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/cards/{cardId}/controls")
    @Operation(summary = "Update card controls (e.g. online, ATM, POS toggles)")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateCardControls(
            @PathVariable Long cardId, @RequestBody Map<String, Object> controls) {
        return ResponseEntity.ok(ApiResponse.ok(controls));
    }

    @PostMapping("/cards/{cardId}/block")
    @Operation(summary = "Block a card")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> blockCard(
            @PathVariable Long cardId, @RequestBody Map<String, String> data) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // SELF-SERVICE: SERVICE REQUESTS
    // ========================================================================

    @GetMapping("/service-requests")
    @Operation(summary = "Get customer's service requests")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getServiceRequests() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/service-requests")
    @Operation(summary = "Create a new service request")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createServiceRequest(@RequestBody Map<String, String> data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "id", 1,
                "status", "PENDING",
                "type", data.getOrDefault("type", ""),
                "description", data.getOrDefault("description", "")
        )));
    }

    @GetMapping("/service-requests/types")
    @Operation(summary = "Get available service request types")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<String>>> getRequestTypes() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                "Cheque Book Request", "Statement Request", "Card Replacement",
                "Account Update", "General Inquiry"
        )));
    }
}
