package com.cbs.channel.controller;

import com.cbs.channel.dto.*;
import com.cbs.channel.entity.*;
import com.cbs.channel.mapper.ChannelMapper;
import com.cbs.channel.service.OmnichannelService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/channels") @RequiredArgsConstructor
@Tag(name = "Omnichannel", description = "Session management, cross-channel handoff, channel config")
public class OmnichannelController {

    private final OmnichannelService omnichannelService;
    private final ChannelMapper channelMapper;

    @GetMapping("/sessions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    @Operation(summary = "List active sessions with pagination")
    public ResponseEntity<ApiResponse<List<ChannelSessionResponse>>> listSessions(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<ChannelSession> sessionPage = omnichannelService.getActiveSessionsPaged(page, size);
        List<ChannelSessionResponse> responses = channelMapper.toSessionResponseList(sessionPage.getContent());
        return ResponseEntity.ok(ApiResponse.ok(responses, com.cbs.common.dto.PageMeta.from(sessionPage)));
    }

    @PostMapping("/sessions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ChannelSessionResponse>> createSession(
            @RequestParam String channel, @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String deviceId, @RequestParam(required = false) String deviceType,
            @RequestParam(required = false) String ipAddress, @RequestParam(required = false) String userAgent) {
        ChannelSession session = omnichannelService.createSession(channel, customerId, deviceId, deviceType, ipAddress, userAgent);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(channelMapper.toSessionResponse(session)));
    }

    @PostMapping("/sessions/{sessionId}/handoff")
    @Operation(summary = "Hand off session to a different channel with context preservation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ChannelSessionResponse>> handoff(@PathVariable String sessionId,
            @RequestParam String targetChannel, @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String ipAddress) {
        ChannelSession session = omnichannelService.handoffSession(sessionId, targetChannel, deviceId, ipAddress);
        return ResponseEntity.ok(ApiResponse.ok(channelMapper.toSessionResponse(session)));
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

    @GetMapping("/sessions/cleanup")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> getCleanupInfo() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("expired", 0)));
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
    public ResponseEntity<ApiResponse<ChannelConfigResponse>> saveConfig(@Valid @RequestBody SaveChannelConfigRequest request) {
        ChannelConfig entity = channelMapper.toEntity(request);
        if (request.getId() != null) {
            entity.setId(request.getId());
        }
        ChannelConfig saved = omnichannelService.saveConfig(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(channelMapper.toConfigResponse(saved)));
    }

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChannelConfigResponse>>> getConfigs() {
        return ResponseEntity.ok(ApiResponse.ok(channelMapper.toConfigResponseList(omnichannelService.getAllConfigs())));
    }
}
