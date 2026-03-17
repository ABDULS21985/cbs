package com.cbs.escrow.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.web.CbsPageRequestFactory;
import com.cbs.escrow.dto.*;
import com.cbs.escrow.service.EscrowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/escrow")
@RequiredArgsConstructor
@Tag(name = "Escrow & Trust", description = "Ring-fenced accounts with conditional release and multi-signatory approval")
public class EscrowController {

    private final EscrowService escrowService;
    private final CbsPageRequestFactory pageRequestFactory;

    @PostMapping
    @Operation(summary = "Create an escrow mandate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EscrowResponse>> createMandate(@Valid @RequestBody CreateEscrowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(escrowService.createMandate(request), "Escrow mandate created"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get escrow mandate details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<EscrowResponse>> getMandate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(escrowService.getMandate(id)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer's escrow mandates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<EscrowResponse>>> getCustomerMandates(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<EscrowResponse> result = escrowService.getCustomerMandates(customerId,
                pageRequestFactory.create(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{mandateId}/release")
    @Operation(summary = "Request a release from escrow")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EscrowReleaseDto>> requestRelease(
            @PathVariable Long mandateId,
            @RequestParam BigDecimal amount,
            @RequestParam String reason,
            @RequestParam(required = false) Long releaseToAccountId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(escrowService.requestRelease(mandateId, amount, reason, releaseToAccountId)));
    }

    @PostMapping("/releases/{releaseId}/approve")
    @Operation(summary = "Approve and execute an escrow release")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EscrowReleaseDto>> approveRelease(@PathVariable Long releaseId) {
        return ResponseEntity.ok(ApiResponse.ok(escrowService.approveAndExecuteRelease(releaseId)));
    }
}
