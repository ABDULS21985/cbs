package com.cbs.digital.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.digital.entity.*;
import com.cbs.digital.service.InternetBankingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/internet-banking") @RequiredArgsConstructor
@Tag(name = "Internet Banking Portal", description = "Session management, feature access control, MFA gating, idle/absolute timeout")
public class InternetBankingController {
    private final InternetBankingService service;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<InternetBankingSession>> login(
            @RequestParam Long customerId, @RequestParam String loginMethod,
            @RequestParam(required = false) String deviceFingerprint,
            @RequestParam(required = false) String ipAddress, @RequestParam(required = false) String userAgent) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                service.login(customerId, loginMethod, deviceFingerprint, ipAddress, userAgent)));
    }

    @PostMapping("/sessions/{sessionId}/mfa-complete")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<InternetBankingSession>> completeMfa(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(service.completeMfa(sessionId)));
    }

    @PostMapping("/sessions/{sessionId}/touch")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<InternetBankingSession>> touch(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(service.touchSession(sessionId)));
    }

    @PostMapping("/sessions/{sessionId}/logout")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Void>> logout(@PathVariable String sessionId) {
        service.logout(sessionId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/sessions/{sessionId}/features")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<InternetBankingFeature>>> features(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAvailableFeatures(sessionId)));
    }

    @GetMapping("/sessions/{sessionId}/can-access/{featureCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> canAccess(
            @PathVariable String sessionId, @PathVariable String featureCode) {
        boolean granted = service.canAccessFeature(sessionId, featureCode);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("feature", featureCode, "granted", granted)));
    }

    @PostMapping("/sessions/expire-idle")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> expireIdle() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("expired", service.expireIdleSessions())));
    }
}
