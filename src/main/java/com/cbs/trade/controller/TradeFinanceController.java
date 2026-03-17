package com.cbs.trade.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.web.CbsPageRequestFactory;
import com.cbs.trade.entity.*;
import com.cbs.trade.service.TradeFinanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/trade")
@RequiredArgsConstructor
@Tag(name = "Trade Finance", description = "Letters of Credit, Guarantees, Collections, Supply Chain Finance, Document Digitisation")
public class TradeFinanceController {

    private final TradeFinanceService tradeService;
    private final CbsPageRequestFactory pageRequestFactory;

    // ========== LETTERS OF CREDIT ==========

    @PostMapping("/lc")
    @Operation(summary = "Issue a Letter of Credit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LetterOfCredit>> issueLC(
            @RequestParam Long applicantId, @RequestParam LcType lcType,
            @RequestParam String beneficiaryName, @RequestParam BigDecimal amount,
            @RequestParam String currencyCode, @RequestParam LocalDate expiryDate,
            @RequestParam String goodsDescription,
            @RequestParam(required = false) List<String> requiredDocuments,
            @RequestParam(required = false) String paymentTerms,
            @RequestParam(required = false) Integer tenorDays,
            @RequestParam(required = false) Long marginAccountId,
            @RequestParam(required = false) BigDecimal marginPercentage,
            @RequestParam(required = false) BigDecimal commissionRate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tradeService.issueLC(
                applicantId, lcType, beneficiaryName, amount, currencyCode, expiryDate,
                goodsDescription, requiredDocuments, paymentTerms, tenorDays,
                marginAccountId, marginPercentage, commissionRate)));
    }

    @GetMapping("/lc/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<LetterOfCredit>> getLC(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tradeService.getLC(id)));
    }

    @GetMapping("/lc/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LetterOfCredit>>> getCustomerLCs(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<LetterOfCredit> result = tradeService.getCustomerLCs(customerId, pageRequestFactory.create(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/lc/{id}/settle")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LetterOfCredit>> settleLC(@PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(tradeService.settlePresentation(id, amount)));
    }

    @PostMapping("/lc/batch/expire")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> expireLCs() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", tradeService.processExpiredLCs())));
    }

    // ========== BANK GUARANTEES ==========

    @PostMapping("/guarantees")
    @Operation(summary = "Issue a Bank Guarantee")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankGuarantee>> issueGuarantee(
            @RequestParam Long applicantId, @RequestParam GuaranteeType guaranteeType,
            @RequestParam String beneficiaryName, @RequestParam BigDecimal amount,
            @RequestParam String currencyCode, @RequestParam LocalDate expiryDate,
            @RequestParam String purpose,
            @RequestParam(required = false) Boolean autoExtend,
            @RequestParam(required = false) Integer extensionPeriodDays,
            @RequestParam(required = false) Long marginAccountId,
            @RequestParam(required = false) BigDecimal marginPercentage,
            @RequestParam(required = false) BigDecimal commissionRate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tradeService.issueGuarantee(
                applicantId, guaranteeType, beneficiaryName, amount, currencyCode, expiryDate,
                purpose, autoExtend, extensionPeriodDays, marginAccountId, marginPercentage, commissionRate)));
    }

    @GetMapping("/guarantees/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<BankGuarantee>> getGuarantee(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tradeService.getGuarantee(id)));
    }

    @GetMapping("/guarantees/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<BankGuarantee>>> getCustomerGuarantees(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<BankGuarantee> result = tradeService.getCustomerGuarantees(customerId, pageRequestFactory.create(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/guarantees/{id}/claim")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankGuarantee>> claimGuarantee(@PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(tradeService.processGuaranteeClaim(id, amount)));
    }

    @PostMapping("/guarantees/batch/expire")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processGuaranteeExpiry() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", tradeService.processExpiredGuarantees())));
    }

    // ========== DOCUMENTARY COLLECTIONS ==========

    @PostMapping("/collections")
    @Operation(summary = "Create a Documentary Collection (D/P or D/A)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DocumentaryCollection>> createCollection(
            @RequestParam Long drawerCustomerId, @RequestParam String collectionType,
            @RequestParam String draweeName, @RequestParam BigDecimal amount,
            @RequestParam String currencyCode, @RequestParam(required = false) List<String> documents,
            @RequestParam(required = false) Integer tenorDays) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                tradeService.createCollection(drawerCustomerId, collectionType, draweeName, amount, currencyCode, documents, tenorDays)));
    }

    @PostMapping("/collections/{id}/settle")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DocumentaryCollection>> settleCollection(@PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(tradeService.settleCollection(id, amount)));
    }

    // ========== SUPPLY CHAIN FINANCE ==========

    @PostMapping("/scf/programmes")
    @Operation(summary = "Create a Supply Chain Finance programme")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SupplyChainProgramme>> createProgramme(
            @RequestParam Long anchorCustomerId, @RequestParam ScfProgrammeType type,
            @RequestParam String programmeName, @RequestParam BigDecimal limit,
            @RequestParam String currencyCode, @RequestParam LocalDate expiryDate,
            @RequestParam(required = false) BigDecimal discountRate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                tradeService.createScfProgramme(anchorCustomerId, type, programmeName, limit, currencyCode, expiryDate, discountRate)));
    }

    @PostMapping("/scf/invoices")
    @Operation(summary = "Finance an invoice under a SCF programme")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ScfInvoice>> financeInvoice(
            @RequestParam Long programmeId, @RequestParam String invoiceNumber,
            @RequestParam(required = false) Long sellerId, @RequestParam(required = false) Long buyerId,
            @RequestParam BigDecimal invoiceAmount, @RequestParam String currencyCode,
            @RequestParam LocalDate invoiceDate, @RequestParam LocalDate dueDate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                tradeService.financeInvoice(programmeId, invoiceNumber, sellerId, buyerId, invoiceAmount, currencyCode, invoiceDate, dueDate)));
    }

    // ========== TRADE DOCUMENTS ==========

    @PostMapping("/documents")
    @Operation(summary = "Upload a trade document for OCR/AI extraction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TradeDocument>> uploadDocument(
            @RequestParam TradeDocCategory category, @RequestParam(required = false) Long lcId,
            @RequestParam(required = false) Long collectionId, @RequestParam(required = false) Long customerId,
            @RequestParam String fileName, @RequestParam String fileType,
            @RequestParam String storagePath, @RequestParam(required = false) Long fileSizeBytes) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                tradeService.uploadTradeDocument(category, lcId, collectionId, customerId, fileName, fileType, storagePath, fileSizeBytes)));
    }

    @PostMapping("/documents/{id}/verify")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TradeDocument>> verifyDocument(@PathVariable Long id,
            @RequestParam boolean compliant, @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(ApiResponse.ok(tradeService.verifyTradeDocument(id, compliant, notes)));
    }

    @GetMapping("/documents/lc/{lcId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<TradeDocument>>> getLcDocuments(@PathVariable Long lcId) {
        return ResponseEntity.ok(ApiResponse.ok(tradeService.getLcDocuments(lcId)));
    }
}
