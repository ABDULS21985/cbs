package com.cbs.channelactivity.controller;

import com.cbs.channelactivity.dto.*;
import com.cbs.channelactivity.entity.ChannelActivityLog;
import com.cbs.channelactivity.entity.ChannelActivitySummary;
import com.cbs.channelactivity.mapper.ChannelActivityMapper;
import com.cbs.channelactivity.service.ChannelActivityService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/channel-activity") @RequiredArgsConstructor
@Tag(name = "Channel Activity", description = "Omnichannel interaction logging and analytics")
public class ChannelActivityController {
    private final ChannelActivityService service;
    private final ChannelActivityMapper mapper;

    @PostMapping("/log")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ActivityLogResponse>> log(@Valid @RequestBody LogActivityRequest request) {
        ChannelActivityLog entity = mapper.toEntity(request);
        ChannelActivityLog saved = service.logActivity(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mapper.toLogResponse(saved)));
    }

    @GetMapping("/log")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ActivityLogResponse>>> listLogs() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toLogResponseList(service.getAllLogs())));
    }

    @GetMapping("/customer/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ActivityLogResponse>>> getCustomerActivity(
            @PathVariable Long id, @RequestParam(required = false) String channel) {
        return ResponseEntity.ok(ApiResponse.ok(
                mapper.toLogResponseList(service.getCustomerActivity(id, channel))));
    }

    @GetMapping("/summarize")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<ActivitySummaryResponse>>> getSummaries() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toSummaryResponseList(service.getAllSummaries())));
    }

    @PostMapping("/summarize")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ActivitySummaryResponse>> summarize(
            @RequestParam Long customerId, @RequestParam String channel,
            @RequestParam String periodType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate) {
        ChannelActivitySummary summary = service.aggregateSummary(customerId, channel, periodType, periodDate);
        return ResponseEntity.ok(ApiResponse.ok(mapper.toSummaryResponse(summary)));
    }
}
