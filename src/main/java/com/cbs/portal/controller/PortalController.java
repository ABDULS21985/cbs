package com.cbs.portal.controller;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.customer.dto.CustomerResponse;
import com.cbs.portal.dto.*;
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
    private final com.cbs.account.service.AccountService accountService;
    private final com.cbs.account.repository.TransactionJournalRepository transactionJournalRepository;
    private final com.cbs.payments.repository.BeneficiaryRepository beneficiaryRepository;
    private final com.cbs.card.repository.CardRepository cardRepository;
    private final com.cbs.portal.repository.ServiceRequestRepository serviceRequestRepository;

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

    @GetMapping("/dashboard/enhanced/{customerId}")
    @Operation(summary = "Get enhanced portal dashboard with financial health, spending insights, goals, and upcoming events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<EnhancedDashboardResponse>> getEnhancedDashboard(
            @PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getEnhancedDashboard(customerId)));
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
    // SECURITY — password, 2FA, sessions
    // ========================================================================

    @PostMapping("/security/change-password")
    @Operation(summary = "Change portal password")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestParam Long customerId,
            @Valid @RequestBody ChangePasswordRequest request) {
        portalService.changePassword(customerId, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Password changed successfully"));
    }

    @PostMapping("/security/2fa/enable")
    @Operation(summary = "Enable two-factor authentication")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<TwoFactorResponse>> enable2fa(@RequestParam Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.enable2fa(customerId)));
    }

    @PostMapping("/security/2fa/disable")
    @Operation(summary = "Disable two-factor authentication")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<TwoFactorResponse>> disable2fa(@RequestParam Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.disable2fa(customerId)));
    }

    @GetMapping("/security/login-history")
    @Operation(summary = "Get login history")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<LoginHistoryDto>>> getLoginHistory(
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getLoginHistory(customerId, Math.min(limit, 50))));
    }

    @GetMapping("/security/active-sessions")
    @Operation(summary = "Get active sessions")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<ActiveSessionDto>>> getActiveSessions(@RequestParam Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getActiveSessions(customerId)));
    }

    @DeleteMapping("/security/sessions/{sessionId}")
    @Operation(summary = "Terminate an active session")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Void>> terminateSession(
            @RequestParam Long customerId,
            @PathVariable String sessionId) {
        portalService.terminateSession(customerId, sessionId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Session terminated"));
    }

    // ========================================================================
    // ACTIVITY LOG
    // ========================================================================

    @GetMapping("/activity-log")
    @Operation(summary = "Get customer activity log")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<ActivityLogDto>>> getActivityLog(
            @RequestParam Long customerId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = portalService.getActivityLog(customerId, eventType, from, to,
                PageRequest.of(page, Math.min(size, 100)));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // PREFERENCES
    // ========================================================================

    @GetMapping("/preferences")
    @Operation(summary = "Get customer preferences")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<PortalPreferencesDto>> getPreferences(@RequestParam Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.getPreferences(customerId)));
    }

    @PutMapping("/preferences")
    @Operation(summary = "Update customer preferences")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<PortalPreferencesDto>> updatePreferences(
            @RequestParam Long customerId,
            @RequestBody PortalPreferencesDto preferences) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.updatePreferences(customerId, preferences)));
    }

    // ========================================================================
    // SELF-SERVICE: ACCOUNTS & TRANSACTIONS
    // ========================================================================

    @GetMapping("/accounts")
    @Operation(summary = "Get authenticated customer's accounts")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getMyAccounts() {
        // Uses /my endpoint pattern — returns first page of all accounts for now
        var pageable = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AccountResponse> result = accountService.searchAccounts(null, null, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent()));
    }

    @GetMapping("/accounts/{accountId}/transactions")
    @Operation(summary = "Get transactions for a specific account")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getTransactions(
            @PathVariable Long accountId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        AccountResponse acct = accountService.getAccountById(accountId);
        LocalDate fromDate = from != null ? LocalDate.parse(from) : null;
        LocalDate toDate = to != null ? LocalDate.parse(to) : null;
        var pageable = PageRequest.of(0, 50);
        Page<TransactionResponse> txns = accountService.getTransactionHistory(acct.getAccountNumber(), fromDate, toDate, pageable);
        return ResponseEntity.ok(ApiResponse.ok(txns.getContent()));
    }

    @GetMapping("/transactions/recent")
    @Operation(summary = "Get recent transactions across all accounts")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<com.cbs.account.entity.TransactionJournal>>> getRecentTransactions() {
        var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "postingDate"));
        Page<com.cbs.account.entity.TransactionJournal> txns = transactionJournalRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(txns.getContent()));
    }

    // ========================================================================
    // SELF-SERVICE: BENEFICIARIES
    // ========================================================================

    @GetMapping("/beneficiaries")
    @Operation(summary = "List saved beneficiaries")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<com.cbs.payments.entity.Beneficiary>>> getBeneficiaries() {
        return ResponseEntity.ok(ApiResponse.ok(beneficiaryRepository.findByIsActiveTrue()));
    }

    @PostMapping("/beneficiaries")
    @Operation(summary = "Add a new beneficiary")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<com.cbs.payments.entity.Beneficiary>> addBeneficiary(
            @RequestBody com.cbs.payments.entity.Beneficiary beneficiary) {
        beneficiary.setIsActive(true);
        com.cbs.payments.entity.Beneficiary saved = beneficiaryRepository.save(beneficiary);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(saved));
    }

    @DeleteMapping("/beneficiaries/{id}")
    @Operation(summary = "Remove a beneficiary")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeBeneficiary(@PathVariable Long id) {
        beneficiaryRepository.findById(id).ifPresent(b -> {
            b.setIsActive(false);
            beneficiaryRepository.save(b);
        });
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========================================================================
    // SELF-SERVICE: CARDS
    // ========================================================================

    @GetMapping("/cards")
    @Operation(summary = "Get authenticated customer's cards")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<com.cbs.card.entity.Card>>> getMyCards() {
        var pageable = PageRequest.of(0, 50);
        Page<com.cbs.card.entity.Card> cards = cardRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(cards.getContent()));
    }

    @PostMapping("/cards/{cardId}/controls")
    @Operation(summary = "Update card controls (e.g. online, ATM, POS toggles)")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<com.cbs.card.entity.Card>> updateCardControls(
            @PathVariable Long cardId, @RequestBody Map<String, Object> controls) {
        com.cbs.card.entity.Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Card", "id", cardId));
        // Apply controls to card entity
        if (controls.containsKey("onlineEnabled")) {
            card.setIsOnlineEnabled((Boolean) controls.get("onlineEnabled"));
        }
        if (controls.containsKey("atmEnabled")) {
            card.setIsAtmEnabled((Boolean) controls.get("atmEnabled"));
        }
        if (controls.containsKey("posEnabled")) {
            card.setIsPosEnabled((Boolean) controls.get("posEnabled"));
        }
        if (controls.containsKey("contactlessEnabled")) {
            card.setIsContactlessEnabled((Boolean) controls.get("contactlessEnabled"));
        }
        if (controls.containsKey("internationalEnabled")) {
            card.setIsInternationalEnabled((Boolean) controls.get("internationalEnabled"));
        }
        com.cbs.card.entity.Card saved = cardRepository.save(card);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @PostMapping("/cards/{cardId}/block")
    @Operation(summary = "Block a card")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> blockCard(
            @PathVariable Long cardId, @RequestBody Map<String, String> data) {
        com.cbs.card.entity.Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Card", "id", cardId));
        card.setStatus(com.cbs.card.entity.CardStatus.BLOCKED);
        cardRepository.save(card);
        return ResponseEntity.ok(ApiResponse.ok(null, "Card blocked successfully"));
    }

    // ========================================================================
    // SELF-SERVICE: SERVICE REQUESTS
    // ========================================================================

    @GetMapping("/service-requests")
    @Operation(summary = "Get customer's service requests")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<com.cbs.portal.entity.ServiceRequest>>> getServiceRequests() {
        return ResponseEntity.ok(ApiResponse.ok(serviceRequestRepository.findAllByOrderByCreatedAtDesc()));
    }

    @PostMapping("/service-requests")
    @Operation(summary = "Create a new service request")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<com.cbs.portal.entity.ServiceRequest>> createServiceRequest(
            @RequestBody com.cbs.portal.entity.ServiceRequest request) {
        request.setStatus("PENDING");
        com.cbs.portal.entity.ServiceRequest saved = serviceRequestRepository.save(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(saved));
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

    // ========================================================================
    // TRANSFERS (PORTAL SELF-SERVICE)
    // ========================================================================

    @PostMapping("/transfers/internal")
    @Operation(summary = "Execute internal (same-bank) transfer")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> executeInternalTransfer(
            @RequestBody Map<String, Object> request) {
        Long debitAccountId = ((Number) request.get("debitAccountId")).longValue();
        Long creditAccountId = ((Number) request.get("creditAccountId")).longValue();
        java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());
        String narration = (String) request.getOrDefault("narration", "Portal transfer");
        String idempotencyKey = (String) request.get("idempotencyKey");

        // Idempotency check
        if (idempotencyKey != null) {
            var existing = transactionJournalRepository.findByExternalRef(idempotencyKey);
            if (existing.isPresent()) {
                return ResponseEntity.ok(ApiResponse.ok(Map.of(
                        "status", "COMPLETED",
                        "message", "Transfer already processed",
                        "reference", existing.get().getTransactionRef()
                )));
            }
        }

        var result = portalService.executePortalTransfer(debitAccountId, creditAccountId, amount, narration, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    @PostMapping("/transfers/validate")
    @Operation(summary = "Validate/name-enquiry for transfer recipient")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateTransfer(
            @RequestBody Map<String, Object> request) {
        String accountNumber = (String) request.get("accountNumber");
        String bankCode = (String) request.getOrDefault("bankCode", "000"); // 000 = same bank

        Map<String, Object> result = portalService.nameEnquiry(accountNumber, bankCode);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/transfers/otp/send")
    @Operation(summary = "Send OTP for transfer authorization")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendTransferOtp(
            @RequestBody Map<String, Object> request) {
        Long accountId = ((Number) request.get("accountId")).longValue();
        Map<String, Object> result = portalService.sendTransferOtp(accountId);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/transfers/otp/verify")
    @Operation(summary = "Verify OTP for transfer authorization")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyTransferOtp(
            @RequestBody Map<String, Object> request) {
        String otpCode = (String) request.get("otpCode");
        String sessionId = (String) request.get("sessionId");
        boolean valid = portalService.verifyTransferOtp(sessionId, otpCode);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("valid", valid)));
    }

    @GetMapping("/transfers/limits")
    @Operation(summary = "Get transfer limits for the customer")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTransferLimits() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "dailyLimit", 5_000_000,
                "perTransactionLimit", 2_000_000,
                "usedToday", 0,
                "remainingDaily", 5_000_000,
                "otpThreshold", 50_000
        )));
    }

    @GetMapping("/transfers/recent")
    @Operation(summary = "Get recent transfers")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getRecentTransfers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var pageable = PageRequest.of(page, Math.min(size, 50), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<com.cbs.account.entity.TransactionJournal> result = transactionJournalRepository.findAll(pageable);
        List<TransactionResponse> responses = result.getContent().stream()
                .map(txn -> TransactionResponse.builder()
                        .id(txn.getId())
                        .transactionRef(txn.getTransactionRef())
                        .accountNumber(txn.getAccount() != null ? txn.getAccount().getAccountNumber() : null)
                        .transactionType(txn.getTransactionType())
                        .amount(txn.getAmount())
                        .currencyCode(txn.getCurrencyCode())
                        .narration(txn.getNarration())
                        .status(txn.getStatus())
                        .createdAt(txn.getCreatedAt())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, PageMeta.from(result)));
    }
}
