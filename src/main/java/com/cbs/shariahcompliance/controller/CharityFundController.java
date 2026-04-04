package com.cbs.shariahcompliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.shariahcompliance.dto.CharityFundDtos;
import com.cbs.shariahcompliance.entity.CharityFundBatchDisbursement;
import com.cbs.shariahcompliance.entity.CharityFundLedgerEntry;
import com.cbs.shariahcompliance.service.CharityFundService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/charity-fund")
@RequiredArgsConstructor
public class CharityFundController {

    private final CharityFundService charityFundService;

    @GetMapping("/balance")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<BigDecimal>> getBalance() {
        return ResponseEntity.ok(ApiResponse.ok(charityFundService.getCurrentBalance()));
    }

    @GetMapping("/ledger")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<List<CharityFundLedgerEntry>>> getLedger(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                charityFundService.getLedger(fromDate, toDate, PageRequest.of(page, size)).getContent()));
    }

    @GetMapping("/report")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<CharityFundDtos.CharityFundReportDetail>> getReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.ok(charityFundService.getCharityFundReport(fromDate, toDate)));
    }

    @GetMapping("/inflow-breakdown")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<CharityFundDtos.CharityFundBreakdown>> getBreakdown(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.ok(charityFundService.getInflowBreakdown(fromDate, toDate)));
    }

    @GetMapping("/compliance-report")
    @PreAuthorize("hasAnyRole('COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<CharityFundDtos.CharityFundComplianceReport>> getComplianceReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.ok(charityFundService.getComplianceReport(fromDate, toDate)));
    }

    @PostMapping("/disbursements")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<CharityFundBatchDisbursement>> createBatch(
            @RequestBody CharityFundDtos.CreateBatchDisbursementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(charityFundService.createBatchDisbursement(request)));
    }

    @GetMapping("/disbursements/{batchId}")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<CharityFundBatchDisbursement>> getBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.ok(charityFundService.getBatch(batchId)));
    }

    @PostMapping("/disbursements/{batchId}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<CharityFundBatchDisbursement>> approveBatch(
            @PathVariable Long batchId,
            @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(charityFundService.approveBatchDisbursement(batchId, approvedBy)));
    }

    @PostMapping("/disbursements/{batchId}/execute")
    @PreAuthorize("hasRole('FINANCE')")
    public ResponseEntity<ApiResponse<CharityFundBatchDisbursement>> executeBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.ok(charityFundService.executeBatchDisbursement(batchId)));
    }

    @PostMapping("/disburse")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<CharityFundDtos.CharityFundDisbursementResult>> disburse(
            @RequestBody CharityFundDtos.DisburseFundsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(charityFundService.disburseFunds(request)));
    }
}
