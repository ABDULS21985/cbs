package com.cbs.integration.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.integration.entity.*;
import com.cbs.integration.service.Psd2Service;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/integration/psd2") @RequiredArgsConstructor
@Tag(name = "PSD2 / Open Banking Compliance", description = "TPP registration, eIDAS certificate validation, SCA session management, exemption handling")
public class Psd2Controller {

    private final Psd2Service psd2Service;

    @GetMapping("/tpp")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Psd2TppRegistration>>> listAllTpps() {
        return ResponseEntity.ok(ApiResponse.ok(psd2Service.getAllTpps()));
    }

    @PostMapping("/tpp")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Psd2TppRegistration>> registerTpp(@RequestBody Psd2TppRegistration tpp) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(psd2Service.registerTpp(tpp)));
    }

    @PostMapping("/tpp/{tppId}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Psd2TppRegistration>> activate(@PathVariable String tppId) {
        return ResponseEntity.ok(ApiResponse.ok(psd2Service.activateTpp(tppId)));
    }

    @PostMapping("/tpp/{tppId}/suspend")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Psd2TppRegistration>> suspend(@PathVariable String tppId) {
        return ResponseEntity.ok(ApiResponse.ok(psd2Service.suspendTpp(tppId)));
    }

    @GetMapping("/tpp/active")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Psd2TppRegistration>>> getActiveTpps() {
        return ResponseEntity.ok(ApiResponse.ok(psd2Service.getActiveTpps()));
    }

    @GetMapping("/sca/initiate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getScaInitiateInfo() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY", "methods", "OTP,PUSH,BIOMETRIC")));
    }

    @PostMapping("/sca/initiate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Psd2ScaSession>> initiateSca(
            @RequestParam String tppId, @RequestParam Long customerId, @RequestParam String scaMethod,
            @RequestParam(required = false) Long paymentId, @RequestParam(required = false) String consentId,
            @RequestParam(required = false) BigDecimal amount,
            @RequestParam(required = false) String ipAddress, @RequestParam(required = false) String userAgent) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                psd2Service.initiateSca(tppId, customerId, scaMethod, paymentId, consentId, amount, ipAddress, userAgent)));
    }

    @PostMapping("/sca/{sessionId}/finalise")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Psd2ScaSession>> finaliseSca(
            @PathVariable String sessionId, @RequestParam boolean success) {
        return ResponseEntity.ok(ApiResponse.ok(psd2Service.finaliseSca(sessionId, success)));
    }

    @GetMapping("/sca/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Psd2ScaSession>>> getCustomerSessions(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(psd2Service.getCustomerSessions(customerId)));
    }
}
