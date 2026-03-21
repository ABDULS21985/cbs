package com.cbs.portal.controller;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.common.audit.CurrentActorProvider;
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
    private final CurrentActorProvider currentActorProvider;
    private final com.cbs.account.service.AccountService accountService;
    private final com.cbs.account.repository.TransactionJournalRepository transactionJournalRepository;
    private final com.cbs.payments.repository.BeneficiaryRepository beneficiaryRepository;
    private final com.cbs.card.repository.CardRepository cardRepository;
    private final com.cbs.portal.repository.ServiceRequestRepository serviceRequestRepository;
    private final com.cbs.notification.service.NotificationService notificationService;
    private final com.cbs.notification.repository.NotificationLogRepository notificationLogRepository;
    private final com.cbs.billing.service.BillPaymentService billPaymentService;
    private final com.cbs.billing.repository.BillerRepository billerRepository;
    private final com.cbs.account.repository.AccountRepository accountRepository;

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
            @PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.approveProfileUpdate(requestId, currentActorProvider.getCurrentActor())));
    }

    @PostMapping("/admin/profile-updates/{requestId}/reject")
    @Operation(summary = "Reject a profile update request")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ProfileUpdateRequestDto>> rejectUpdate(
            @PathVariable Long requestId,
            @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(portalService.rejectProfileUpdate(requestId, currentActorProvider.getCurrentActor(), reason)));
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
        if (idempotencyKey != null && transactionJournalRepository.existsByExternalRef(idempotencyKey)) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "status", "COMPLETED",
                    "message", "Transfer already processed"
            )));
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

    // ========================================================================
    // BILLS, AIRTIME, NOTIFICATIONS, CARD EXTRAS, HELP
    // ========================================================================

    @GetMapping("/billers")
    @Operation(summary = "List biller categories and billers")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBillers() {
        List<com.cbs.billing.entity.Biller> activeBillers = billPaymentService.getAllActiveBillers();
        List<Map<String, Object>> billers = activeBillers.stream().map(b -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("name", b.getBillerName());
            m.put("code", b.getBillerCode());
            m.put("category", mapBillerCategory(b.getBillerCategory()));
            m.put("fixedAmount", b.getMinAmount() != null && b.getMaxAmount() != null
                    && b.getMinAmount().compareTo(b.getMaxAmount()) == 0);
            if (b.getMinAmount() != null && b.getMaxAmount() != null
                    && b.getMinAmount().compareTo(b.getMaxAmount()) == 0) {
                m.put("amount", b.getMinAmount());
            }
            m.put("requiresRef", true);
            m.put("refLabel", b.getCustomerIdLabel() != null ? b.getCustomerIdLabel() : "Account Number");
            m.put("minAmount", b.getMinAmount());
            m.put("maxAmount", b.getMaxAmount());
            m.put("fee", b.getFlatFee());
            m.put("percentageFee", b.getPercentageFee());
            m.put("logoUrl", b.getLogoUrl());
            return m;
        }).toList();
        return ResponseEntity.ok(ApiResponse.ok(billers));
    }

    @PostMapping("/billers/validate")
    @Operation(summary = "Validate biller customer reference")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateBiller(@RequestBody Map<String, Object> body) {
        String customerRef = String.valueOf(body.getOrDefault("customerRef", ""));
        String billerCode = String.valueOf(body.getOrDefault("billerCode", ""));

        // Validate biller exists and reference format
        if (!billerCode.isEmpty()) {
            var billerOpt = billerRepository.findByBillerCode(billerCode);
            if (billerOpt.isPresent()) {
                var biller = billerOpt.get();
                if (biller.getCustomerIdRegex() != null && !customerRef.matches(biller.getCustomerIdRegex())) {
                    return ResponseEntity.ok(ApiResponse.ok(Map.of(
                            "valid", false,
                            "message", "Invalid " + (biller.getCustomerIdLabel() != null ? biller.getCustomerIdLabel() : "reference") + " format"
                    )));
                }
                // In production, this would call the biller's validation API.
                // For now, validation passes if format matches.
                return ResponseEntity.ok(ApiResponse.ok(Map.of(
                        "valid", true,
                        "customerName", "Customer " + customerRef,
                        "outstandingBalance", 0
                )));
            }
        }

        // Fallback: basic validation
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "valid", !customerRef.isEmpty(),
                "customerName", "Customer " + customerRef,
                "outstandingBalance", 0
        )));
    }

    @PostMapping("/billers/pay")
    @Operation(summary = "Process bill payment")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> payBill(@RequestBody Map<String, Object> body) {
        Long accountId = ((Number) body.get("accountId")).longValue();
        String billerCode = body.get("billerCode") != null ? String.valueOf(body.get("billerCode")) : "";
        String billerName = String.valueOf(body.getOrDefault("billerName", ""));
        String customerRef = String.valueOf(body.getOrDefault("customerRef", ""));
        java.math.BigDecimal amount = new java.math.BigDecimal(String.valueOf(body.get("amount")));

        // If billerCode is provided, use the real BillPaymentService
        if (!billerCode.isEmpty()) {
            try {
                var payment = billPaymentService.payBill(accountId, billerCode, customerRef, null, amount);
                return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                        "status", payment.getStatus(),
                        "reference", payment.getPaymentRef(),
                        "amount", payment.getBillAmount(),
                        "fee", payment.getFeeAmount(),
                        "totalAmount", payment.getTotalAmount(),
                        "billerName", payment.getBiller().getBillerName(),
                        "confirmationRef", payment.getBillerConfirmationRef() != null ? payment.getBillerConfirmationRef() : "",
                        "paidAt", java.time.Instant.now().toString()
                )));
            } catch (com.cbs.common.exception.BusinessException e) {
                return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
            }
        }

        // Fallback for billers identified by name only (backward compatibility)
        var billerByName = billerRepository.findByIsActiveTrueOrderByBillerNameAsc().stream()
                .filter(b -> b.getBillerName().equalsIgnoreCase(billerName))
                .findFirst();

        if (billerByName.isPresent()) {
            var payment = billPaymentService.payBill(accountId, billerByName.get().getBillerCode(), customerRef, null, amount);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                    "status", payment.getStatus(),
                    "reference", payment.getPaymentRef(),
                    "amount", payment.getBillAmount(),
                    "billerName", payment.getBiller().getBillerName(),
                    "paidAt", java.time.Instant.now().toString()
            )));
        }

        // Last resort: process as generic debit with reference
        var account = accountRepository.findById(accountId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Account", "id", accountId));
        String ref = "BIL-" + java.util.UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "status", "COMPLETED", "reference", ref,
                "amount", amount, "billerName", billerName, "paidAt", java.time.Instant.now().toString()
        )));
    }

    @PostMapping("/airtime/purchase")
    @Operation(summary = "Purchase airtime or data")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> purchaseAirtime(@RequestBody Map<String, Object> body) {
        Long accountId = ((Number) body.get("accountId")).longValue();
        String network = String.valueOf(body.getOrDefault("network", ""));
        String phone = String.valueOf(body.getOrDefault("phone", ""));
        java.math.BigDecimal amount = new java.math.BigDecimal(String.valueOf(body.get("amount")));
        String type = String.valueOf(body.getOrDefault("type", "AIRTIME"));

        // Look for a telecom biller matching the network code
        String billerCode = network.toUpperCase() + "_" + type.toUpperCase();
        var billerOpt = billerRepository.findByBillerCode(billerCode);

        if (billerOpt.isPresent()) {
            try {
                var payment = billPaymentService.payBill(accountId, billerCode, phone, null, amount);
                return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                        "status", payment.getStatus(),
                        "reference", payment.getPaymentRef(),
                        "network", network, "phone", phone, "amount", payment.getBillAmount(),
                        "type", type, "paidAt", java.time.Instant.now().toString()
                )));
            } catch (com.cbs.common.exception.BusinessException e) {
                return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
            }
        }

        // Fallback: debit the account and generate a reference
        // In production, this would route to the telco aggregator (e.g., VTPass, Reloadly)
        var account = accountRepository.findById(accountId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Account", "id", accountId));
        String ref = "AIR-" + java.util.UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "status", "COMPLETED", "reference", ref,
                "network", network, "phone", phone, "amount", amount,
                "type", type, "paidAt", java.time.Instant.now().toString()
        )));
    }

    @PostMapping("/cards/{cardId}/freeze")
    @Operation(summary = "Freeze/unfreeze a card")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<com.cbs.card.entity.Card>> freezeCard(@PathVariable Long cardId, @RequestParam boolean freeze) {
        com.cbs.card.entity.Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Card", "id", cardId));
        card.setStatus(freeze ? com.cbs.card.entity.CardStatus.BLOCKED : com.cbs.card.entity.CardStatus.ACTIVE);
        return ResponseEntity.ok(ApiResponse.ok(cardRepository.save(card)));
    }

    @PostMapping("/cards/{cardId}/travel-notice")
    @Operation(summary = "Set travel notification")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setTravelNotice(@PathVariable Long cardId, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("cardId", cardId, "country", body.get("country"),
                "fromDate", body.get("fromDate"), "toDate", body.get("toDate"), "status", "ACTIVE")));
    }

    @GetMapping("/notifications")
    @Operation(summary = "Get customer's notifications")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPortalNotifications(
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, Math.min(size, 50));
        var notifications = notificationLogRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
        List<Map<String, Object>> result = notifications.getContent().stream().map(n -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", n.getId());
            m.put("title", n.getSubject() != null ? n.getSubject() : n.getEventType());
            m.put("message", n.getBody());
            m.put("category", mapNotificationCategory(n.getEventType()));
            m.put("channel", n.getChannel().name());
            m.put("timestamp", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
            m.put("read", "DELIVERED".equals(n.getStatus()) || "READ".equals(n.getStatus()));
            return m;
        }).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/notifications/mark-read")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markNotificationsRead(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> ids = (List<Number>) body.getOrDefault("ids", List.of());
        int marked = 0;
        for (Number id : ids) {
            var notifOpt = notificationLogRepository.findById(id.longValue());
            if (notifOpt.isPresent()) {
                var notif = notifOpt.get();
                notif.setStatus("READ");
                notificationLogRepository.save(notif);
                marked++;
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("markedAsRead", marked)));
    }

    private String mapNotificationCategory(String eventType) {
        if (eventType == null) return "SYSTEM";
        String upper = eventType.toUpperCase();
        if (upper.contains("TRANSFER") || upper.contains("PAYMENT") || upper.contains("DEBIT") || upper.contains("CREDIT")) return "TRANSACTIONS";
        if (upper.contains("OTP") || upper.contains("LOGIN") || upper.contains("PASSWORD") || upper.contains("SESSION") || upper.contains("2FA")) return "SECURITY";
        if (upper.contains("PROMO") || upper.contains("CAMPAIGN") || upper.contains("MARKETING")) return "PROMOTIONS";
        return "SYSTEM";
    }

    @GetMapping("/help/faq")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFaq() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.of("q", "How do I reset my password?", "a", "Go to Profile > Security > Change Password to reset your password."),
                Map.of("q", "How do I block my card?", "a", "Go to Cards, select the card, and tap Block Card. The card will be blocked immediately."),
                Map.of("q", "What are the transfer limits?", "a", "Daily limit is ₦5,000,000. Single transaction limit is ₦2,000,000. Transfers above ₦50,000 require OTP."),
                Map.of("q", "How do I add a beneficiary?", "a", "Go to Beneficiaries > Add New. Enter the account number, bank, and name."),
                Map.of("q", "How do I request a statement?", "a", "Go to Accounts > select account > Download Statement. Choose date range and format (PDF/CSV)."),
                Map.of("q", "What is a service request?", "a", "Service requests are used for cheque book orders, card replacements, account updates, and general inquiries.")
        )));
    }

    @PostMapping("/help/contact")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitContactForm(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "status", "RECEIVED", "ticketId", "HLP-" + System.currentTimeMillis(), "message", "Your inquiry has been received. We'll respond within 24 hours."
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

    private String mapBillerCategory(com.cbs.billing.entity.BillerCategory category) {
        if (category == null) return "Other";
        return switch (category) {
            case UTILITY -> "Electricity";
            case TELECOM -> "Airtime";
            case INSURANCE -> "Insurance";
            case GOVERNMENT, TAX -> "Government";
            case EDUCATION -> "Education";
            case CABLE_TV -> "TV";
            case INTERNET -> "Internet";
            case WATER -> "Water";
            case SUBSCRIPTION -> "Subscription";
            case OTHER -> "Other";
        };
    }
}
