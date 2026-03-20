package com.cbs.mortgage.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.document.entity.Document;
import com.cbs.document.entity.DocumentType;
import com.cbs.document.service.DocumentService;
import com.cbs.mortgage.entity.MortgageLoan;
import com.cbs.mortgage.service.MortgageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/mortgages") @RequiredArgsConstructor
@Tag(name = "Mortgage Lending", description = "Mortgage origination, LTV monitoring, rate reversion, overpayments, porting")
public class MortgageController {
    private final MortgageService mortgageService;
    private final DocumentService documentService;

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MortgageLoan>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getAllMortgages()));
    }

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> originate(@RequestBody MortgageLoan mortgage) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mortgageService.originate(mortgage)));
    }
    @PostMapping("/{number}/advance") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> advance(@PathVariable String number, @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.advanceStatus(number, status)));
    }
    @PostMapping("/{number}/overpayment") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> overpay(
            @PathVariable String number,
            @RequestParam(required = false) BigDecimal amount,
            @RequestBody(required = false) Map<String, Object> body) {
        BigDecimal resolvedAmount = amount;
        if (resolvedAmount == null && body != null && body.get("amount") != null) {
            resolvedAmount = new BigDecimal(String.valueOf(body.get("amount")));
        }
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.makeOverpayment(number, resolvedAmount)));
    }
    @PostMapping("/{number}/revert-svr") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> revertSvr(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.revertToSvr(number)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MortgageLoan>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getByCustomer(customerId)));
    }
    @GetMapping("/{id}")
    @io.swagger.v3.oas.annotations.Operation(summary = "Get mortgage detail by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getById(id)));
    }

    @GetMapping("/{id}/ltv-history")
    @io.swagger.v3.oas.annotations.Operation(summary = "Get LTV ratio history for a mortgage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> getLtvHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getLtvHistory(id)));
    }

    @GetMapping("/{id}/documents")
    @io.swagger.v3.oas.annotations.Operation(summary = "List documents linked to a mortgage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Document>>> getDocuments(@PathVariable Long id) {
        MortgageLoan mortgage = mortgageService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(documentService.getLoanAccountDocuments(mortgage.getAccountId())));
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @io.swagger.v3.oas.annotations.Operation(summary = "Upload a document linked to a mortgage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Document>> uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "OTHER") DocumentType type,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) java.time.LocalDate expiryDate) {
        MortgageLoan mortgage = mortgageService.getById(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(documentService.uploadMultipartDocument(
                mortgage.getCustomerId(),
                type,
                file,
                description,
                tags != null ? tags : List.of(),
                expiryDate,
                mortgage.getAccountId(),
                mortgage.getAccountId()
        )));
    }

    @GetMapping("/high-ltv") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MortgageLoan>>> highLtv(@RequestParam(defaultValue = "80") BigDecimal maxLtv) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getHighLtvMortgages(maxLtv)));
    }
    @GetMapping("/fixed-rate-expiring") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MortgageLoan>>> fixedExpiring() {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getFixedRateExpiring()));
    }
}
