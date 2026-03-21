package com.cbs.merchant.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.merchant.dto.*;
import com.cbs.merchant.entity.AcquiringFacility;
import com.cbs.merchant.entity.MerchantChargeback;
import com.cbs.merchant.entity.MerchantSettlement;
import com.cbs.merchant.mapper.AcquiringMapper;
import com.cbs.merchant.service.AcquiringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/acquiring")
@RequiredArgsConstructor
@Tag(name = "Acquiring Services", description = "Merchant acquiring facilities, settlements, chargebacks, PCI compliance")
public class AcquiringController {

    private final AcquiringService service;
    private final AcquiringMapper mapper;

    // ── Facilities ───────────────────────────────────────────────────────────────

    @GetMapping("/facilities")
    @Operation(summary = "List all acquiring facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> listFacilities() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toFacilityResponseList(service.getAllFacilities())));
    }

    @PostMapping("/facilities")
    @Operation(summary = "Setup a new acquiring facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FacilityResponse>> setupFacility(
            @Valid @RequestBody SetupFacilityRequest request) {
        AcquiringFacility entity = mapper.toEntity(request);
        AcquiringFacility saved = service.setupFacility(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mapper.toFacilityResponse(saved)));
    }

    @PutMapping("/facilities/{id}/activate")
    @Operation(summary = "Activate an acquiring facility")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FacilityResponse>> activateFacility(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toFacilityResponse(service.activateFacility(id))));
    }

    @GetMapping("/facilities/merchant/{merchantId}")
    @Operation(summary = "Get facilities by merchant")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> getFacilitiesByMerchant(
            @PathVariable Long merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toFacilityResponseList(service.getFacilitiesByMerchant(merchantId))));
    }

    // ── Settlements ──────────────────────────────────────────────────────────────

    @GetMapping("/settlements/process")
    @Operation(summary = "List all settlements")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SettlementResponse>>> listSettlements() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toSettlementResponseList(service.getAllSettlements())));
    }

    @PostMapping("/settlements/process")
    @Operation(summary = "Process settlement for a merchant on a date")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SettlementResponse>> processSettlement(
            @RequestParam Long merchantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        MerchantSettlement settlement = service.processSettlement(merchantId, date);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mapper.toSettlementResponse(settlement)));
    }

    @GetMapping("/settlements/merchant/{merchantId}")
    @Operation(summary = "Get settlement history for a merchant")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SettlementResponse>>> getSettlementHistory(
            @PathVariable Long merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toSettlementResponseList(service.getSettlementHistory(merchantId))));
    }

    // ── Chargebacks ──────────────────────────────────────────────────────────────

    @GetMapping("/chargebacks")
    @Operation(summary = "List all chargebacks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChargebackResponse>>> listChargebacks() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toChargebackResponseList(service.getAllChargebacks())));
    }

    @PostMapping("/chargebacks")
    @Operation(summary = "Record a new chargeback")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ChargebackResponse>> recordChargeback(
            @Valid @RequestBody RecordChargebackRequest request) {
        MerchantChargeback entity = mapper.toEntity(request);
        MerchantChargeback saved = service.recordChargeback(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mapper.toChargebackResponse(saved)));
    }

    @PostMapping("/chargebacks/{id}/representment")
    @Operation(summary = "Submit representment evidence for a chargeback")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ChargebackResponse>> submitRepresentment(
            @PathVariable Long id,
            @Valid @RequestBody SubmitRepresentmentRequest request) {
        MerchantChargeback result = service.submitRepresentment(id, request.getResponseRef(), request.getEvidence());
        return ResponseEntity.ok(ApiResponse.ok(mapper.toChargebackResponse(result)));
    }

    // ── PCI Compliance ───────────────────────────────────────────────────────────

    @GetMapping("/compliance/pci")
    @Operation(summary = "Get PCI compliance report grouped by status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, List<FacilityResponse>>>> getPciComplianceReport() {
        Map<String, List<AcquiringFacility>> rawReport = service.getPciComplianceReport();
        Map<String, List<FacilityResponse>> response = rawReport.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> mapper.toFacilityResponseList(e.getValue())
                ));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
