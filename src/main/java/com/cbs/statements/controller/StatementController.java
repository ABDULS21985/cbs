package com.cbs.statements.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.statements.entity.StatementSubscription;
import com.cbs.statements.service.StatementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/v1/statements")
@RequiredArgsConstructor
@Tag(name = "Statements", description = "Account statements, certificates, confirmations, and subscriptions")
public class StatementController {

    private final StatementService statementService;

    // ── Generate ────────────────────────────────────────────────────────────────

    @GetMapping("/generate")
    @Operation(summary = "Generate statement for account and date range")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGenerateInfo(
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        if (accountId == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
        }
        if (fromDate == null) fromDate = LocalDate.now().minusMonths(1);
        if (toDate == null) toDate = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(statementService.generateStatement(accountId, fromDate, toDate)));
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate statement for account and date range")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateStatement(
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        if (accountId == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
        }
        if (fromDate == null) fromDate = LocalDate.now().minusMonths(1);
        if (toDate == null) toDate = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(statementService.generateStatement(accountId, fromDate, toDate)));
    }

    // ── Download ────────────────────────────────────────────────────────────────

    @GetMapping("/download")
    @Operation(summary = "Download generated statement (PDF-ready data)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> downloadStatement(
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "PDF") String format) {
        if (accountId == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
        }
        if (fromDate == null) fromDate = LocalDate.now().minusMonths(1);
        if (toDate == null) toDate = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(statementService.downloadStatement(accountId, fromDate, toDate, format)));
    }

    // ── Email ───────────────────────────────────────────────────────────────────

    @GetMapping("/email")
    @Operation(summary = "Get email statement status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getEmailStatementStatus() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
    }

    @PostMapping("/email")
    @Operation(summary = "Email statement to customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> emailStatement(
            @RequestParam Long accountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam String emailAddress) {
        return ResponseEntity.ok(ApiResponse.ok(
                statementService.emailStatement(accountId, fromDate, toDate, emailAddress)));
    }

    // ── Certificate ─────────────────────────────────────────────────────────────

    @GetMapping("/certificate")
    @Operation(summary = "Certificate of balance data for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCertificateOfBalance(
            @RequestParam(required = false) Long accountId) {
        if (accountId == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
        }
        return ResponseEntity.ok(ApiResponse.ok(statementService.getCertificateOfBalance(accountId)));
    }

    // ── Confirmation ────────────────────────────────────────────────────────────

    @GetMapping("/confirmation")
    @Operation(summary = "Account confirmation letter data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAccountConfirmation(
            @RequestParam(required = false) Long accountId) {
        if (accountId == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
        }
        return ResponseEntity.ok(ApiResponse.ok(statementService.getAccountConfirmation(accountId)));
    }

    // ── Subscriptions ───────────────────────────────────────────────────────────

    @GetMapping("/subscriptions")
    @Operation(summary = "Recurring statement subscriptions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<StatementSubscription>>> getSubscriptions(
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long accountId) {
        if (accountId != null) {
            return ResponseEntity.ok(ApiResponse.ok(statementService.getSubscriptionsByAccount(accountId)));
        }
        return ResponseEntity.ok(ApiResponse.ok(statementService.getSubscriptions(customerId)));
    }

    @PostMapping("/subscriptions")
    @Operation(summary = "Create a statement subscription")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StatementSubscription>> createSubscription(
            @RequestBody Map<String, Object> subscription) {
        StatementSubscription created = statementService.createSubscription(subscription);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PostMapping("/subscriptions/{id}")
    @Operation(summary = "Update a statement subscription")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StatementSubscription>> updateSubscription(
            @PathVariable Long id,
            @RequestBody Map<String, Object> subscription) {
        return ResponseEntity.ok(ApiResponse.ok(statementService.updateSubscription(id, subscription)));
    }

    @PostMapping("/subscriptions/{id}/delete")
    @Operation(summary = "Delete a statement subscription")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteSubscription(@PathVariable Long id) {
        statementService.deleteSubscription(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "DELETED")));
    }
}
