package com.cbs.openitem.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.openitem.entity.SecuritiesFail;
import com.cbs.openitem.service.SecuritiesFailService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController @RequestMapping("/v1/securities-fails") @RequiredArgsConstructor
@Tag(name = "Securities Fails", description = "Settlement fail tracking, escalation, buy-in, CSDR penalty calculation")
public class SecuritiesFailController {

    private final SecuritiesFailService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SecuritiesFail>> record(@RequestBody SecuritiesFail fail) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordFail(fail)));
    }

    @PostMapping("/{ref}/escalate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SecuritiesFail>> escalate(@PathVariable String ref) {
        SecuritiesFail fail = service.getByRef(ref);
        return ResponseEntity.ok(ApiResponse.ok(service.escalateFail(fail.getId())));
    }

    @PostMapping("/{ref}/buy-in") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SecuritiesFail>> buyIn(@PathVariable String ref) {
        SecuritiesFail fail = service.getByRef(ref);
        return ResponseEntity.ok(ApiResponse.ok(service.initiateBuyIn(fail.getId())));
    }

    @PostMapping("/{ref}/penalty") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SecuritiesFail>> penalty(
            @PathVariable String ref, @RequestParam BigDecimal dailyRate) {
        SecuritiesFail fail = service.getByRef(ref);
        return ResponseEntity.ok(ApiResponse.ok(service.calculatePenalty(fail.getId(), dailyRate)));
    }

    @PostMapping("/{ref}/resolve") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SecuritiesFail>> resolve(
            @PathVariable String ref, @RequestParam String action, @RequestParam(defaultValue = "") String notes) {
        SecuritiesFail fail = service.getByRef(ref);
        return ResponseEntity.ok(ApiResponse.ok(service.resolveFail(fail.getId(), action, notes)));
    }

    @GetMapping("/dashboard") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getFailsDashboard()));
    }

    @GetMapping("/counterparty-report") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> counterpartyReport() {
        return ResponseEntity.ok(ApiResponse.ok(service.getCounterpartyFailReport()));
    }
}
