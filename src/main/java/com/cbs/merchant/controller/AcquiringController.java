package com.cbs.merchant.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.merchant.entity.AcquiringFacility;
import com.cbs.merchant.entity.MerchantChargeback;
import com.cbs.merchant.entity.MerchantSettlement;
import com.cbs.merchant.service.AcquiringService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/acquiring") @RequiredArgsConstructor
@Tag(name = "Acquiring Services", description = "Merchant acquiring facilities, settlements, chargebacks, PCI compliance")
public class AcquiringController {

    private final AcquiringService service;

    @PostMapping("/facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AcquiringFacility>> setupFacility(@RequestBody AcquiringFacility facility) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.setupFacility(facility)));
    }

    @PutMapping("/facilities/{id}/activate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AcquiringFacility>> activateFacility(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.activateFacility(id)));
    }

    @GetMapping("/facilities/merchant/{merchantId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AcquiringFacility>>> getFacilitiesByMerchant(@PathVariable Long merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getFacilitiesByMerchant(merchantId)));
    }

    @PostMapping("/settlements/process")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MerchantSettlement>> processSettlement(
            @RequestParam Long merchantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.processSettlement(merchantId, date)));
    }

    @GetMapping("/settlements/merchant/{merchantId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MerchantSettlement>>> getSettlementHistory(@PathVariable Long merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getSettlementHistory(merchantId)));
    }

    @PostMapping("/chargebacks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MerchantChargeback>> recordChargeback(@RequestBody MerchantChargeback chargeback) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordChargeback(chargeback)));
    }

    @PostMapping("/chargebacks/{id}/representment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MerchantChargeback>> submitRepresentment(
            @PathVariable Long id,
            @RequestParam String responseRef,
            @RequestBody Map<String, Object> evidence) {
        return ResponseEntity.ok(ApiResponse.ok(service.submitRepresentment(id, responseRef, evidence)));
    }

    @GetMapping("/compliance/pci")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, List<AcquiringFacility>>>> getPciComplianceReport() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPciComplianceReport()));
    }
}
