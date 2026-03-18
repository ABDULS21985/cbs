package com.cbs.security.siem.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.security.siem.entity.SiemEvent;
import com.cbs.security.siem.service.SiemService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/v1/security/siem") @RequiredArgsConstructor
@Tag(name = "SIEM Integration", description = "Security event ingestion, forwarding to external SIEM, correlation, severity queries")
public class SiemController {

    private final SiemService siemService;

    @PostMapping("/events")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SiemEvent>> logEvent(
            @RequestParam String source, @RequestParam String category,
            @RequestParam String severity, @RequestParam String description,
            @RequestBody(required = false) Map<String, Object> eventData,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String correlationId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                siemService.logSecurityEvent(source, category, severity, description,
                        eventData, userId, ipAddress, sessionId, correlationId)));
    }

    @PostMapping("/forward")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> forwardToSiem() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("forwarded", siemService.forwardToSiem())));
    }

    @GetMapping("/events/severity/{severity}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Page<SiemEvent>>> getBySeverity(
            @PathVariable String severity, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(siemService.getBySeverity(severity, pageable)));
    }

    @GetMapping("/events/category/{category}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Page<SiemEvent>>> getByCategory(
            @PathVariable String category, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(siemService.getByCategory(category, pageable)));
    }

    @GetMapping("/events/correlation/{correlationId}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Page<SiemEvent>>> getByCorrelation(
            @PathVariable String correlationId, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(siemService.getByCorrelation(correlationId, pageable)));
    }
}
