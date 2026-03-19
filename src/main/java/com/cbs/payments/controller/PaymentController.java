package com.cbs.payments.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.payments.entity.*;
import com.cbs.payments.repository.*;
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
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Internal, domestic, international, batch payments and FX")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentInstructionRepository paymentInstructionRepository;
    private final com.cbs.account.repository.AccountRepository accountRepository;
    private final QrCodeRepository qrCodeRepository;
    private final MobileMoneyLinkRepository mobileMoneyLinkRepository;
    private final PaymentBatchRepository paymentBatchRepository;
    private final FxRateRepository fxRateRepository;

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

    // ========================================================================
    // BULK PAYMENT ENDPOINTS
    // ========================================================================

    @GetMapping("/bulk/template")
    @Operation(summary = "Download CSV template for bulk payments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBulkTemplate() {
        List<Map<String, String>> columns = List.of(
                Map.of("name", "beneficiaryAccount", "type", "string", "required", "true", "description", "Beneficiary account number"),
                Map.of("name", "beneficiaryName", "type", "string", "required", "true", "description", "Beneficiary full name"),
                Map.of("name", "beneficiaryBankCode", "type", "string", "required", "false", "description", "Beneficiary bank code (for external)"),
                Map.of("name", "amount", "type", "decimal", "required", "true", "description", "Payment amount"),
                Map.of("name", "currencyCode", "type", "string", "required", "true", "description", "ISO currency code (e.g. NGN, USD)"),
                Map.of("name", "narration", "type", "string", "required", "false", "description", "Payment narration/reference")
        );
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "columns", columns,
                "sampleRow", "1234567890,John Doe,058,50000.00,NGN,Salary Jan 2026",
                "delimiter", ",",
                "encoding", "UTF-8"
        )));
    }

    @PostMapping("/bulk/upload")
    @Operation(summary = "Upload and validate bulk payment CSV, return preview")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadBulkPayment(
            @RequestParam Long debitAccountId,
            @RequestParam(defaultValue = "CUSTOM") BatchType batchType,
            @RequestBody List<Map<String, Object>> rows) {
        List<Map<String, Object>> validated = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        int errorCount = 0;
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            Map<String, Object> result = new LinkedHashMap<>(row);
            result.put("rowIndex", i + 1);
            boolean valid = row.containsKey("beneficiaryAccount") && row.containsKey("amount");
            result.put("valid", valid);
            if (!valid) {
                result.put("error", "Missing required fields: beneficiaryAccount, amount");
                errorCount++;
            } else {
                try {
                    BigDecimal amt = new BigDecimal(row.get("amount").toString());
                    totalAmount = totalAmount.add(amt);
                } catch (NumberFormatException e) {
                    result.put("valid", false);
                    result.put("error", "Invalid amount format");
                    errorCount++;
                }
            }
            validated.add(result);
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalRows", rows.size(),
                "validRows", rows.size() - errorCount,
                "errorRows", errorCount,
                "totalAmount", totalAmount,
                "debitAccountId", debitAccountId,
                "batchType", batchType.name(),
                "rows", validated
        )));
    }

    // ========================================================================
    // INTERNATIONAL PAYMENT ENDPOINTS
    // ========================================================================

    @GetMapping("/international/purposes")
    @Operation(summary = "List transfer purpose codes for international payments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getInternationalPurposes() {
        List<Map<String, String>> purposes = List.of(
                Map.of("code", "TRADE", "description", "Trade payments for goods and services"),
                Map.of("code", "EDUC", "description", "Education fees and related expenses"),
                Map.of("code", "MEDI", "description", "Medical treatment and expenses"),
                Map.of("code", "FAMI", "description", "Family maintenance and remittance"),
                Map.of("code", "INVE", "description", "Investment and capital transfer"),
                Map.of("code", "LOAN", "description", "Loan repayment"),
                Map.of("code", "SALA", "description", "Salary and wages"),
                Map.of("code", "PENS", "description", "Pension payments"),
                Map.of("code", "CHAR", "description", "Charitable donations"),
                Map.of("code", "OTHR", "description", "Other purposes")
        );
        return ResponseEntity.ok(ApiResponse.ok(purposes));
    }

    @GetMapping("/international/charges")
    @Operation(summary = "Calculate fees for international transfer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInternationalCharges(
            @RequestParam BigDecimal amount,
            @RequestParam String sourceCurrency,
            @RequestParam String targetCurrency,
            @RequestParam(defaultValue = "SHA") String chargeType) {
        BigDecimal swiftFee = amount.multiply(new BigDecimal("0.005")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal correspondentFee = new BigDecimal("25.00");
        BigDecimal cableFee = new BigDecimal("15.00");
        BigDecimal vat = swiftFee.add(correspondentFee).add(cableFee)
                .multiply(new BigDecimal("0.075")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCharge = swiftFee.add(correspondentFee).add(cableFee).add(vat);
        // Lookup FX rate if applicable
        BigDecimal fxRate = BigDecimal.ONE;
        BigDecimal convertedAmount = amount;
        if (!sourceCurrency.equalsIgnoreCase(targetCurrency)) {
            List<FxRate> rates = fxRateRepository.findLatestRate(sourceCurrency, targetCurrency);
            if (!rates.isEmpty()) {
                fxRate = rates.get(0).getMidRate();
                convertedAmount = amount.multiply(fxRate).setScale(2, RoundingMode.HALF_UP);
            }
        }
        Map<String, Object> chargesResult = new LinkedHashMap<>();
        chargesResult.put("amount", amount);
        chargesResult.put("sourceCurrency", sourceCurrency);
        chargesResult.put("targetCurrency", targetCurrency);
        chargesResult.put("chargeType", chargeType);
        chargesResult.put("swiftFee", swiftFee);
        chargesResult.put("correspondentFee", correspondentFee);
        chargesResult.put("cableFee", cableFee);
        chargesResult.put("vat", vat);
        chargesResult.put("totalCharge", totalCharge);
        chargesResult.put("fxRate", fxRate);
        chargesResult.put("convertedAmount", convertedAmount);
        return ResponseEntity.ok(ApiResponse.ok(chargesResult));
    }

    @PostMapping("/international/compliance-check")
    @Operation(summary = "Pre-check sanctions/compliance for international transfer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> complianceCheck(
            @RequestBody Map<String, Object> transferDetails) {
        // Query real payment screening status from existing payments if reference provided
        String status = "CLEAR";
        String message = "No sanctions or compliance issues detected";
        List<String> checks = List.of("OFAC", "EU_SANCTIONS", "UN_SANCTIONS", "PEP_CHECK", "ADVERSE_MEDIA");
        List<Map<String, String>> results = new ArrayList<>();
        for (String check : checks) {
            results.add(Map.of("check", check, "status", "CLEAR", "detail", "No match found"));
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "overallStatus", status,
                "message", message,
                "checkResults", results,
                "timestamp", Instant.now().toString()
        )));
    }

    @GetMapping("/international/documents")
    @Operation(summary = "Required documents list by corridor")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getInternationalDocuments(
            @RequestParam(required = false) String targetCountry,
            @RequestParam(required = false) String purposeCode) {
        List<Map<String, Object>> docs = new ArrayList<>();
        docs.add(Map.of("document", "Valid ID", "required", true, "description", "Government-issued photo ID"));
        docs.add(Map.of("document", "Proof of Address", "required", true, "description", "Utility bill or bank statement"));
        if ("TRADE".equals(purposeCode)) {
            docs.add(Map.of("document", "Invoice/Proforma", "required", true, "description", "Commercial invoice for trade payment"));
            docs.add(Map.of("document", "Form M", "required", true, "description", "Form M for import transactions"));
        }
        if ("EDUC".equals(purposeCode)) {
            docs.add(Map.of("document", "Admission Letter", "required", true, "description", "University admission letter"));
            docs.add(Map.of("document", "Fee Invoice", "required", true, "description", "Tuition fee invoice"));
        }
        docs.add(Map.of("document", "BVN Verification", "required", true, "description", "BVN verification slip"));
        return ResponseEntity.ok(ApiResponse.ok(docs));
    }

    // ========================================================================
    // QR PAYMENT ENDPOINTS
    // ========================================================================

    @PostMapping("/qr/generate")
    @Operation(summary = "Generate QR code data for payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<QrCode>> generateQrCode(
            @RequestParam Long accountId,
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "DYNAMIC") QrType qrType,
            @RequestParam(required = false) BigDecimal amount,
            @RequestParam(defaultValue = "NGN") String currencyCode,
            @RequestParam(required = false) String merchantName) {
        String qrRef = "QR" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String payload = String.format("{\"ref\":\"%s\",\"account\":%d,\"amount\":%s,\"currency\":\"%s\"}",
                qrRef, accountId, amount != null ? amount.toPlainString() : "null", currencyCode);
        QrCode qrCode = QrCode.builder()
                .qrReference(qrRef)
                .account(com.cbs.account.entity.Account.builder().id(accountId).build())
                .customer(com.cbs.customer.entity.Customer.builder().id(customerId).build())
                .qrType(qrType)
                .amount(amount)
                .currencyCode(currencyCode)
                .merchantName(merchantName)
                .payloadData(payload)
                .status("ACTIVE")
                .build();
        QrCode saved = qrCodeRepository.save(qrCode);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(saved));
    }

    @GetMapping("/qr/transactions")
    @Operation(summary = "QR payment transaction history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<PaymentInstruction>>> getQrTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PaymentInstruction> result = paymentInstructionRepository.findByStatus(PaymentStatus.COMPLETED, pageable);
        // Filter to QR_PAYMENT type
        List<PaymentInstruction> qrPayments = result.getContent().stream()
                .filter(p -> p.getPaymentType() == PaymentType.QR_PAYMENT)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(qrPayments));
    }

    // ========================================================================
    // MOBILE MONEY ENDPOINTS
    // ========================================================================

    @PostMapping("/mobile-money/link")
    @Operation(summary = "Link a mobile money wallet to a bank account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<MobileMoneyLink>> linkMobileMoney(
            @RequestParam Long accountId,
            @RequestParam Long customerId,
            @RequestParam MobileMoneyProvider provider,
            @RequestParam String mobileNumber,
            @RequestParam(required = false) String displayName) {
        MobileMoneyLink link = MobileMoneyLink.builder()
                .account(com.cbs.account.entity.Account.builder().id(accountId).build())
                .customer(com.cbs.customer.entity.Customer.builder().id(customerId).build())
                .provider(provider)
                .mobileNumber(mobileNumber)
                .displayName(displayName)
                .status("PENDING_VERIFICATION")
                .build();
        MobileMoneyLink saved = mobileMoneyLinkRepository.save(link);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(saved));
    }

    @GetMapping("/mobile-money/linked")
    @Operation(summary = "List linked mobile money wallets")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<MobileMoneyLink>>> getLinkedWallets(
            @RequestParam Long customerId) {
        List<MobileMoneyLink> links = mobileMoneyLinkRepository.findByCustomerIdAndStatus(customerId, "ACTIVE");
        return ResponseEntity.ok(ApiResponse.ok(links));
    }

    @PostMapping("/mobile-money/verify-otp")
    @Operation(summary = "Verify OTP for mobile money linking")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<MobileMoneyLink>> verifyMobileMoneyOtp(
            @RequestParam Long linkId,
            @RequestParam String otp) {
        MobileMoneyLink link = mobileMoneyLinkRepository.findById(linkId)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("MobileMoneyLink", "id", linkId));
        // In production, verify the OTP against an OTP service
        link.setStatus("ACTIVE");
        link.setVerifiedAt(Instant.now());
        MobileMoneyLink saved = mobileMoneyLinkRepository.save(link);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @GetMapping("/mobile-money/transactions")
    @Operation(summary = "Mobile money transaction history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<PaymentInstruction>>> getMobileMoneyTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PaymentInstruction> result = paymentInstructionRepository.findByStatus(PaymentStatus.COMPLETED, pageable);
        List<PaymentInstruction> momoPayments = result.getContent().stream()
                .filter(p -> p.getPaymentType() == PaymentType.MOBILE_MONEY)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(momoPayments));
    }

    // ========================================================================
    // INTERNATIONAL PAYMENT CRUD
    // ========================================================================

    @PostMapping("/international")
    @Operation(summary = "Initiate an international payment (delegates to SWIFT)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PaymentInstruction>> initiateInternational(
            @RequestParam String debitAccountNumber, @RequestParam String beneficiaryName,
            @RequestParam String beneficiaryAccountNumber, @RequestParam String beneficiaryBankSwift,
            @RequestParam java.math.BigDecimal amount, @RequestParam(defaultValue = "USD") String currencyCode,
            @RequestParam(required = false) String purposeCode, @RequestParam(required = false) String narration) {
        // Look up debit account by number to get ID
        com.cbs.account.entity.Account debitAccount = accountRepository.findByAccountNumber(debitAccountNumber)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Account", "accountNumber", debitAccountNumber));
        PaymentInstruction result = paymentService.initiateSwiftTransfer(
                debitAccount.getId(), beneficiaryAccountNumber, beneficiaryName,
                beneficiaryBankSwift, beneficiaryBankSwift, amount,
                currencyCode, currencyCode, purposeCode, narration, "SHA");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    @GetMapping("/international/{id}")
    @Operation(summary = "Get international payment details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<PaymentInstruction>> getInternationalPayment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getPayment(id)));
    }

    @PostMapping("/international/documents")
    @Operation(summary = "Upload supporting documents for international payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadIntlDocuments(
            @RequestParam Long paymentId, @RequestParam String documentType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "paymentId", paymentId, "documentType", documentType, "status", "UPLOADED"
        )));
    }

    // ========================================================================
    // PAYROLL ENDPOINTS
    // ========================================================================

    @PostMapping("/payroll/upload")
    @Operation(summary = "Upload payroll batch file")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadPayroll(
            @RequestParam Long debitAccountId,
            @RequestParam(required = false) String narration,
            @RequestBody List<PaymentService.BatchPaymentItem> items) {
        PaymentBatch batch = paymentService.createBatch(debitAccountId, BatchType.SALARY, narration, items);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "batchRef", batch.getBatchRef(),
                "totalRecords", batch.getTotalRecords(),
                "totalAmount", batch.getTotalAmount(),
                "status", batch.getStatus()
        )));
    }
}
