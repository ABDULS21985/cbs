package com.cbs.shariahcompliance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.shariahcompliance.dto.CharityFundReport;
import com.cbs.shariahcompliance.dto.CharityRecipientResponse;
import com.cbs.shariahcompliance.dto.CreateCharityRecipientRequest;
import com.cbs.shariahcompliance.dto.CreatePurificationBatchRequest;
import com.cbs.shariahcompliance.dto.DisbursementConfirmation;
import com.cbs.shariahcompliance.dto.DisbursementPlan;
import com.cbs.shariahcompliance.dto.PurificationBatchResponse;
import com.cbs.shariahcompliance.dto.PurificationReport;
import com.cbs.shariahcompliance.dto.SsbApprovalRequest;
import com.cbs.shariahcompliance.service.PurificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/shariah-compliance/purification")
@RequiredArgsConstructor
@Slf4j
public class PurificationController {

    private final PurificationService purificationService;

    // ── Batches ───────────────────────────────────────────────────────────────

    @PostMapping("/batches")
    public ResponseEntity<ApiResponse<PurificationBatchResponse>> createBatch(
            @Valid @RequestBody CreatePurificationBatchRequest request) {
        log.info("Creating purification batch");
        PurificationBatchResponse batch = purificationService.createBatch(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(batch, "Purification batch created"));
    }

    @GetMapping("/batches/{id}")
    public ResponseEntity<ApiResponse<PurificationBatchResponse>> getBatch(@PathVariable Long id) {
        PurificationBatchResponse batch = purificationService.getBatch(id);
        return ResponseEntity.ok(ApiResponse.ok(batch));
    }

    @PostMapping("/batches/{id}/plan")
    public ResponseEntity<ApiResponse<Void>> planDisbursements(
            @PathVariable Long id,
            @Valid @RequestBody List<DisbursementPlan> plans) {
        log.info("Planning {} disbursements for batch id={}", plans.size(), id);
        purificationService.planDisbursements(id, plans);
        return ResponseEntity.ok(ApiResponse.ok(null, "Disbursements planned"));
    }

    @PostMapping("/batches/{id}/submit-ssb")
    public ResponseEntity<ApiResponse<Void>> submitForSsbApproval(@PathVariable Long id) {
        log.info("Submitting purification batch id={} for SSB approval", id);
        purificationService.submitForSsbApproval(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Batch submitted for SSB approval"));
    }

    @PostMapping("/batches/{id}/ssb-approve")
    public ResponseEntity<ApiResponse<Void>> ssbApproveBatch(
            @PathVariable Long id,
            @Valid @RequestBody SsbApprovalRequest approval) {
        log.info("SSB approving purification batch id={}", id);
        purificationService.ssbApproveBatch(id, approval);
        return ResponseEntity.ok(ApiResponse.ok(null, "Batch SSB-approved"));
    }

    @PostMapping("/batches/{id}/execute")
    public ResponseEntity<ApiResponse<Void>> executePurification(@PathVariable Long id) {
        log.info("Executing purification for batch id={}", id);
        purificationService.executePurification(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Purification executed"));
    }

    // ── Disbursements ─────────────────────────────────────────────────────────

    @PostMapping("/disbursements/{id}/confirm")
    public ResponseEntity<ApiResponse<Void>> recordDisbursementConfirmation(
            @PathVariable Long id,
            @Valid @RequestBody DisbursementConfirmation confirmation) {
        log.info("Recording disbursement confirmation for id={}", id);
        purificationService.recordDisbursementConfirmation(id, confirmation);
        return ResponseEntity.ok(ApiResponse.ok(null, "Disbursement confirmation recorded"));
    }

    // ── Charities ─────────────────────────────────────────────────────────────

    @PostMapping("/charities")
    public ResponseEntity<ApiResponse<CharityRecipientResponse>> createRecipient(
            @Valid @RequestBody CreateCharityRecipientRequest request) {
        log.info("Creating charity recipient: {}", request.getName());
        CharityRecipientResponse recipient = purificationService.createRecipient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(recipient, "Charity recipient created"));
    }

    @GetMapping("/charities")
    public ResponseEntity<ApiResponse<List<CharityRecipientResponse>>> getApprovedRecipients() {
        List<CharityRecipientResponse> recipients = purificationService.getApprovedRecipients();
        return ResponseEntity.ok(ApiResponse.ok(recipients));
    }

    @PutMapping("/charities/{id}")
    public ResponseEntity<ApiResponse<CharityRecipientResponse>> updateRecipient(
            @PathVariable Long id,
            @Valid @RequestBody CreateCharityRecipientRequest request) {
        log.info("Updating charity recipient id={}", id);
        CharityRecipientResponse recipient = purificationService.updateRecipient(id, request);
        return ResponseEntity.ok(ApiResponse.ok(recipient, "Charity recipient updated"));
    }

    @PostMapping("/charities/{id}/ssb-approve")
    public ResponseEntity<ApiResponse<Void>> ssbApproveRecipient(
            @PathVariable Long id,
            @RequestParam String approvedBy,
            @RequestParam String approvalRef) {
        log.info("SSB approving charity recipient id={}", id);
        purificationService.ssbApproveRecipient(id, approvedBy, approvalRef);
        return ResponseEntity.ok(ApiResponse.ok(null, "Charity recipient SSB-approved"));
    }

    // ── Reporting ─────────────────────────────────────────────────────────────

    @GetMapping("/report")
    public ResponseEntity<ApiResponse<PurificationReport>> getPurificationReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        PurificationReport report = purificationService.getPurificationReport(from, to);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @GetMapping("/charity-fund/report")
    public ResponseEntity<ApiResponse<CharityFundReport>> getCharityFundReport() {
        CharityFundReport report = purificationService.getCharityFundReport();
        return ResponseEntity.ok(ApiResponse.ok(report));
    }
}
