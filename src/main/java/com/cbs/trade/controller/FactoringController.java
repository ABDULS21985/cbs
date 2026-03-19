package com.cbs.trade.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.trade.entity.FactoringFacility;
import com.cbs.trade.entity.FactoringTransaction;
import com.cbs.trade.service.FactoringService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController @RequestMapping("/v1/factoring") @RequiredArgsConstructor
@Tag(name = "Factoring", description = "Factoring facility management, invoice financing, collection tracking, recourse")
public class FactoringController {

    private final FactoringService service;

    @GetMapping("/facility") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.List<FactoringFacility>>> listFacilities() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllFacilities()));
    }

    @PostMapping("/facility") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FactoringFacility>> createFacility(@RequestBody FactoringFacility facility) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createFacility(facility)));
    }

    @GetMapping("/invoice") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.List<FactoringTransaction>>> listInvoices() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllTransactions()));
    }

    @PostMapping("/invoice") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FactoringTransaction>> submitInvoice(@RequestBody FactoringTransaction transaction) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitInvoice(transaction)));
    }

    @PostMapping("/invoice/{id}/fund") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FactoringTransaction>> fund(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.approveAndFund(id)));
    }

    @PostMapping("/invoice/{id}/collect") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FactoringTransaction>> collect(
            @PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(service.recordCollection(id, amount)));
    }

    @PostMapping("/invoice/{id}/recourse") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<FactoringTransaction>> recourse(
            @PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(service.exerciseRecourse(id, amount)));
    }

    @GetMapping("/facility/{code}/concentration") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> concentration(@PathVariable String code) {
        FactoringFacility facility = service.getFacilityByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.getConcentrationReport(facility.getId())));
    }
}
