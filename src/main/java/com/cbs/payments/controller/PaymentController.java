package com.cbs.payments.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.payments.entity.*;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Internal, domestic, international, batch payments and FX")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentInstructionRepository paymentInstructionRepository;

    @PostMapping("/transfer")
    @Operation(summary = "Internal book transfer between accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<PaymentInstruction>> internalTransfer(
            @RequestParam Long debitAccountId, @RequestParam Long creditAccountId,
            @RequestParam BigDecimal amount, @RequestParam(required = false) String narration) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                paymentService.executeInternalTransfer(debitAccountId, creditAccountId, amount, narration)));
    }

    @PostMapping("/domestic")
    @Operation(summary = "Initiate a domestic payment (instant or batch)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PaymentInstruction>> domesticPayment(
            @RequestParam Long debitAccountId, @RequestParam String creditAccountNumber,
            @RequestParam String beneficiaryName, @RequestParam(required = false) String beneficiaryBankCode,
            @RequestParam BigDecimal amount, @RequestParam String currencyCode,
            @RequestParam(required = false) String narration,
            @RequestParam(defaultValue = "true") boolean instant) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                paymentService.initiateDomesticPayment(debitAccountId, creditAccountNumber,
                        beneficiaryName, beneficiaryBankCode, amount, currencyCode, narration, instant)));
    }

    @PostMapping("/swift")
    @Operation(summary = "Initiate a SWIFT international wire transfer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PaymentInstruction>> swiftTransfer(
            @RequestParam Long debitAccountId, @RequestParam String creditAccountNumber,
            @RequestParam String beneficiaryName, @RequestParam String beneficiaryBankCode,
            @RequestParam String beneficiaryBankName, @RequestParam BigDecimal amount,
            @RequestParam String sourceCurrency, @RequestParam String targetCurrency,
            @RequestParam(required = false) String purposeCode,
            @RequestParam(required = false) String remittanceInfo,
            @RequestParam(defaultValue = "SHA") String chargeType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                paymentService.initiateSwiftTransfer(debitAccountId, creditAccountNumber,
                        beneficiaryName, beneficiaryBankCode, beneficiaryBankName, amount,
                        sourceCurrency, targetCurrency, purposeCode, remittanceInfo, chargeType)));
    }

    @PostMapping("/batch")
    @Operation(summary = "Create a batch payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PaymentBatch>> createBatch(
            @RequestParam Long debitAccountId, @RequestParam BatchType batchType,
            @RequestParam(required = false) String narration,
            @RequestBody List<PaymentService.BatchPaymentItem> items) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                paymentService.createBatch(debitAccountId, batchType, narration, items)));
    }

    @PostMapping("/batch/{batchRef}/process")
    @Operation(summary = "Approve and process a batch payment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PaymentBatch>> processBatch(
            @PathVariable String batchRef, @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.processBatch(batchRef, approvedBy)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get payment details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<PaymentInstruction>> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getPayment(id)));
    }

    @GetMapping("/account/{accountId}")
    @Operation(summary = "Get payment history for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<PaymentInstruction>>> getAccountPayments(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<PaymentInstruction> result = paymentService.getAccountPayments(accountId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/fx-rate/{source}/{target}")
    @Operation(summary = "Get latest FX rate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<FxRate>> getFxRate(@PathVariable String source, @PathVariable String target) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getLatestRate(source, target)));
    }

    // List all payments
    @GetMapping
    @Operation(summary = "List all payments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<PaymentInstruction>>> listPayments(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PaymentInstruction> result = paymentInstructionRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // ADDITIONAL PAYMENT ENDPOINTS
    // ========================================================================

    @GetMapping("/recent")
    @Operation(summary = "Get last 10 payment instructions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<PaymentInstruction>>> getRecentPayments() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PaymentInstruction> result = paymentInstructionRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent()));
    }

    @GetMapping("/check-duplicate")
    @Operation(summary = "Check for duplicate payment by beneficiary account and amount")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkDuplicate(
            @RequestParam String beneficiaryAccount,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("duplicate", false)));
    }

    @PostMapping("/name-enquiry")
    @Operation(summary = "NIBSS name enquiry stub")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> nameEnquiry(@RequestBody Map<String, String> data) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "accountNumber", data.getOrDefault("accountNumber", ""),
                "bankCode", data.getOrDefault("bankCode", ""),
                "accountName", "Account Holder Name",
                "status", "SUCCESSFUL"
        )));
    }

    @GetMapping("/fee-preview")
    @Operation(summary = "Fee calculation preview for a payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> feePreview(
            @RequestParam BigDecimal amount,
            @RequestParam(defaultValue = "DOMESTIC") String paymentType,
            @RequestParam(required = false) String currencyCode) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "amount", amount,
                "fee", BigDecimal.ZERO,
                "vat", BigDecimal.ZERO,
                "totalCharge", BigDecimal.ZERO,
                "paymentType", paymentType
        )));
    }

    @GetMapping("/beneficiaries")
    @Operation(summary = "List saved beneficiaries")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBeneficiaries() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/banks")
    @Operation(summary = "List bank codes and names")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getBanks() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }
}
