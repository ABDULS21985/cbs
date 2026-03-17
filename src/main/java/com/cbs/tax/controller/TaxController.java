package com.cbs.tax.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.tax.entity.*;
import com.cbs.tax.service.TaxService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/tax") @RequiredArgsConstructor
@Tag(name = "Tax Engine", description = "Withholding tax, VAT, stamp duty calculation and remittance")
public class TaxController {

    private final TaxService taxService;

    @PostMapping("/rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TaxRule>> createRule(@RequestBody TaxRule rule) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(taxService.createRule(rule)));
    }

    @GetMapping("/preview")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TaxService.TaxPreview>>> preview(
            @RequestParam String appliesTo, @RequestParam BigDecimal amount,
            @RequestParam(required = false) String customerType, @RequestParam(required = false) String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(taxService.previewTax(appliesTo, amount, customerType, productCode)));
    }

    @GetMapping("/history/account/{accountId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TaxTransaction>>> getAccountHistory(@PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<TaxTransaction> result = taxService.getAccountTaxHistory(accountId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/pending-remittance")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<TaxTransaction>>> getPendingRemittance(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<TaxTransaction> result = taxService.getPendingRemittance(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
