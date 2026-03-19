package com.cbs.channelactivity.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.channelactivity.entity.ChannelActivityLog;
import com.cbs.channelactivity.entity.ChannelActivitySummary;
import com.cbs.channelactivity.service.ChannelActivityService;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    @PostMapping("/log") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ChannelActivityLog>> log(@RequestBody ChannelActivityLog entry) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.logActivity(entry)));
    }
    @GetMapping("/log") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChannelActivityLog>>> listLogs() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllLogs()));
    }
    @GetMapping("/customer/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChannelActivityLog>>> getCustomerActivity(@PathVariable Long id, @RequestParam(required = false) String channel) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCustomerActivity(id, channel)));
    }
    @GetMapping("/summarize") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<ChannelActivitySummary>>> getSummaries() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllSummaries()));
    }
    @PostMapping("/summarize") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ChannelActivitySummary>> summarize(@RequestParam Long customerId, @RequestParam String channel, @RequestParam String periodType, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodDate) {
        return ResponseEntity.ok(ApiResponse.ok(service.aggregateSummary(customerId, channel, periodType, periodDate)));
    }
}
