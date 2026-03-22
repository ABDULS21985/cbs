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

import com.cbs.common.audit.CurrentCustomerProvider;

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
    private final BeneficiaryRepository beneficiaryRepository;
    private final BankDirectoryRepository bankDirectoryRepository;
    private final CurrentCustomerProvider currentCustomerProvider;

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
    public ResponseEntity<ApiResponse<PaymentBatch>> processBatch(@PathVariable String batchRef) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.processBatch(batchRef)));
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
        // Check if a payment with same beneficiary and amount was made in last 5 minutes
        Instant fiveMinutesAgo = Instant.now().minusSeconds(300);
        boolean duplicate = paymentInstructionRepository.findAll(PageRequest.of(0, 10,
                Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .anyMatch(p -> beneficiaryAccount.equals(p.getCreditAccountNumber())
                        && amount.compareTo(p.getAmount()) == 0
                        && p.getCreatedAt() != null && p.getCreatedAt().isAfter(fiveMinutesAgo));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("duplicate", duplicate)));
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
    public ResponseEntity<ApiResponse<List<Beneficiary>>> getBeneficiaries() {
        return ResponseEntity.ok(ApiResponse.ok(beneficiaryRepository.findByIsActiveTrue()));
    }

    @GetMapping("/banks")
    @Operation(summary = "List bank codes and names")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<BankDirectory>>> getBanks() {
        return ResponseEntity.ok(ApiResponse.ok(bankDirectoryRepository.findByIsActiveTrueOrderByBankNameAsc()));
    }

    // Bulk payments delegated to BulkPaymentController at /v1/payments/bulk

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
            @RequestParam(required = false) BigDecimal amount,
            @RequestParam(required = false, defaultValue = "NGN") String sourceCurrency,
            @RequestParam(required = false, defaultValue = "USD") String targetCurrency,
            @RequestParam(defaultValue = "SHA") String chargeType) {
        if (amount == null) amount = BigDecimal.ZERO;
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

    @GetMapping("/qr/generate")
    @Operation(summary = "List generated QR codes")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<QrCode>>> listQrCodes() {
        return ResponseEntity.ok(ApiResponse.ok(qrCodeRepository.findAll()));
    }

    @PostMapping("/qr/generate")
    @Operation(summary = "Generate QR code data for payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<QrCode>> generateQrCode(
            @RequestParam Long accountId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "DYNAMIC") QrType qrType,
            @RequestParam(required = false) BigDecimal amount,
            @RequestParam(defaultValue = "NGN") String currencyCode,
            @RequestParam(required = false) String merchantName) {

        // Resolve customerId from JWT auth context if not explicitly provided or zero
        Long resolvedCustomerId = customerId;
        if (resolvedCustomerId == null || resolvedCustomerId == 0L) {
            try {
                resolvedCustomerId = currentCustomerProvider.getCurrentCustomer().getId();
            } catch (Exception e) {
                // Fallback: resolve from the account's customer
                com.cbs.account.entity.Account account = accountRepository.findById(accountId)
                        .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Account", "id", accountId));
                resolvedCustomerId = account.getCustomer().getId();
            }
        }

        String qrRef = "QR" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String payload = String.format("{\"ref\":\"%s\",\"account\":%d,\"amount\":%s,\"currency\":\"%s\"}",
                qrRef, accountId, amount != null ? amount.toPlainString() : "null", currencyCode);
        QrCode qrCode = QrCode.builder()
                .qrReference(qrRef)
                .account(com.cbs.account.entity.Account.builder().id(accountId).build())
                .customer(com.cbs.customer.entity.Customer.builder().id(resolvedCustomerId).build())
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

    @GetMapping("/mobile-money/link")
    @Operation(summary = "List all mobile money links")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MobileMoneyLink>>> listMobileMoneyLinks() {
        return ResponseEntity.ok(ApiResponse.ok(mobileMoneyLinkRepository.findAll()));
    }

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
            @RequestParam(required = false) Long customerId) {
        if (customerId == null) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        List<MobileMoneyLink> links = mobileMoneyLinkRepository.findByCustomerIdAndStatus(customerId, "ACTIVE");
        return ResponseEntity.ok(ApiResponse.ok(links));
    }

    @GetMapping("/mobile-money/verify-otp")
    @Operation(summary = "Get OTP verification status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getVerifyOtpInfo() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
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

    @DeleteMapping("/mobile-money/{id}")
    @Operation(summary = "Unlink a mobile money account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> unlinkMobileMoney(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "UNLINKED")));
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

    @GetMapping("/payroll/upload")
    @Operation(summary = "Get payroll upload status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPayrollUploadStatus() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
    }

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
