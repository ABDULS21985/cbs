package com.cbs.channel.controller;

import com.cbs.channel.entity.*;
import com.cbs.channel.service.OmnichannelService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/channels") @RequiredArgsConstructor
@Tag(name = "Omnichannel", description = "Session management, cross-channel handoff, channel config")
public class OmnichannelController {

    private final OmnichannelService omnichannelService;

    @PostMapping("/sessions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ChannelSession>> createSession(
            @RequestParam String channel, @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String deviceId, @RequestParam(required = false) String deviceType,
            @RequestParam(required = false) String ipAddress, @RequestParam(required = false) String userAgent) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                omnichannelService.createSession(channel, customerId, deviceId, deviceType, ipAddress, userAgent)));
    }

    @PostMapping("/sessions/{sessionId}/handoff")
    @Operation(summary = "Hand off session to a different channel with context preservation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ChannelSession>> handoff(@PathVariable String sessionId,
            @RequestParam String targetChannel, @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String ipAddress) {
        return ResponseEntity.ok(ApiResponse.ok(omnichannelService.handoffSession(sessionId, targetChannel, deviceId, ipAddress)));
    }

    @PostMapping("/sessions/{sessionId}/touch")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Void>> touch(@PathVariable String sessionId) {
        omnichannelService.touchSession(sessionId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/sessions/{sessionId}/end")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Void>> end(@PathVariable String sessionId) {
        omnichannelService.endSession(sessionId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/sessions/cleanup")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> cleanup() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("expired", omnichannelService.cleanupExpiredSessions())));
    }

    @GetMapping("/sessions/active-counts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> activeCounts() {
        return ResponseEntity.ok(ApiResponse.ok(omnichannelService.getActiveSessionCounts()));
    }

    @PostMapping("/config")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ChannelConfig>> saveConfig(@RequestBody ChannelConfig config) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(omnichannelService.saveConfig(config)));
    }

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChannelConfig>>> getConfigs() {
        return ResponseEntity.ok(ApiResponse.ok(omnichannelService.getAllConfigs()));
    }
}
