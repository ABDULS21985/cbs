package com.cbs.security.mfa.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.security.mfa.entity.*;
import com.cbs.security.mfa.service.MfaService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/security/mfa") @RequiredArgsConstructor
@Tag(name = "Multi-Factor Authentication", description = "MFA enrollment, OTP challenge/verify, TOTP/FIDO2, lockout management")
public class MfaController {

    private final MfaService mfaService;

    @PostMapping("/enroll")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<MfaEnrollment>> enroll(
            @RequestParam String userId, @RequestParam(required = false) Long customerId,
            @RequestParam String method,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String deviceId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                mfaService.enroll(userId, customerId, method, phoneNumber, email, deviceId)));
    }

    @GetMapping("/enrollments/{userId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<MfaEnrollment>>> getEnrollments(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(mfaService.getUserEnrollments(userId)));
    }

    @PostMapping("/challenge")
    public ResponseEntity<ApiResponse<Map<String, String>>> createChallenge(
            @RequestParam String userId, @RequestParam String actionContext,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String userAgent) {
        MfaService.MfaChallengeResult result = mfaService.initiateChallenge(userId, actionContext, ipAddress, userAgent);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "challengeId", result.challengeId(),
                "method", result.method(),
                "message", "OTP sent via " + result.method())));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Boolean>> verify(
            @RequestParam String challengeId, @RequestParam String otp) {
        return ResponseEntity.ok(ApiResponse.ok(mfaService.verifyChallenge(challengeId, otp)));
    }
}
