package com.cbs.gateway.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.fingateway.entity.FinancialGateway;
import com.cbs.fingateway.entity.GatewayMessage;
import com.cbs.fingateway.repository.FinancialGatewayRepository;
import com.cbs.fingateway.repository.GatewayMessageRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/gateway")
@RequiredArgsConstructor
@Tag(name = "Gateway Dashboard", description = "Financial gateway message monitoring, stats, and throughput")
public class GatewayDashboardController {

    private final GatewayMessageRepository gatewayMessageRepository;
    private final FinancialGatewayRepository financialGatewayRepository;

    @GetMapping("/messages")
    @Operation(summary = "List gateway messages with filters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GatewayMessage>>> listMessages(
            @RequestParam(required = false) String direction,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<GatewayMessage> result = gatewayMessageRepository.findAll(pageable);
        List<GatewayMessage> filtered = result.getContent().stream()
                .filter(m -> direction == null || m.getDirection().equalsIgnoreCase(direction))
                .filter(m -> status == null || m.getDeliveryStatus().equalsIgnoreCase(status))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(filtered, PageMeta.from(result)));
    }

    @GetMapping("/messages/retry-all-failed")
    @Operation(summary = "Get count of failed gateway messages")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFailedCount() {
        List<GatewayMessage> failed = gatewayMessageRepository.findByDeliveryStatusOrderByQueuedAtAsc("FAILED");
        return ResponseEntity.ok(ApiResponse.ok(Map.of("failedCount", failed.size())));
    }

    @PostMapping("/messages/retry-all-failed")
    @Operation(summary = "Retry all failed gateway messages")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> retryAllFailed() {
        List<GatewayMessage> failed = gatewayMessageRepository.findByDeliveryStatusOrderByQueuedAtAsc("FAILED");
        int retried = 0;
        for (GatewayMessage msg : failed) {
            msg.setDeliveryStatus("QUEUED");
            msg.setDeliveryAttempts(msg.getDeliveryAttempts() + 1);
            gatewayMessageRepository.save(msg);
            retried++;
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "retriedCount", retried,
                "timestamp", Instant.now().toString()
        )));
    }

    @GetMapping("/stats")
    @Operation(summary = "Message counts by status and average processing time")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        List<GatewayMessage> allMessages = gatewayMessageRepository.findAll();
        Map<String, Long> countByStatus = allMessages.stream()
                .collect(Collectors.groupingBy(GatewayMessage::getDeliveryStatus, Collectors.counting()));
        OptionalDouble avgProcessingTime = allMessages.stream()
                .filter(m -> m.getProcessingTimeMs() != null)
                .mapToInt(GatewayMessage::getProcessingTimeMs)
                .average();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalMessages", allMessages.size(),
                "countByStatus", countByStatus,
                "averageProcessingTimeMs", avgProcessingTime.orElse(0.0)
        )));
    }

    @GetMapping("/status")
    @Operation(summary = "Gateway connection status per network")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGatewayStatus() {
        List<FinancialGateway> gateways = financialGatewayRepository.findAll();
        List<Map<String, Object>> statuses = new ArrayList<>();
        for (FinancialGateway gw : gateways) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("gatewayCode", gw.getGatewayCode());
            entry.put("gatewayName", gw.getGatewayName());
            entry.put("gatewayType", gw.getGatewayType());
            entry.put("protocol", gw.getProtocol());
            entry.put("connectionStatus", gw.getConnectionStatus());
            entry.put("lastHeartbeatAt", gw.getLastHeartbeatAt());
            entry.put("isActive", gw.getIsActive());
            entry.put("messagesToday", gw.getMessagesToday());
            entry.put("valueToday", gw.getValueToday());
            statuses.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(statuses));
    }

    @GetMapping("/swift")
    @Operation(summary = "SWIFT-specific message log")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GatewayMessage>>> getSwiftMessages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<GatewayMessage> result = gatewayMessageRepository.findAll(pageable);
        List<GatewayMessage> swiftMessages = result.getContent().stream()
                .filter(m -> "SWIFT_MT".equalsIgnoreCase(m.getMessageFormat())
                        || "SWIFT_MX".equalsIgnoreCase(m.getMessageFormat())
                        || (m.getSenderBic() != null && !m.getSenderBic().isEmpty()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(swiftMessages, PageMeta.from(result)));
    }

    @GetMapping("/throughput")
    @Operation(summary = "Messages per hour/day throughput trend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getThroughput() {
        List<GatewayMessage> allMessages = gatewayMessageRepository.findAll();
        Instant now = Instant.now();
        Instant last24h = now.minus(24, ChronoUnit.HOURS);
        Instant last7d = now.minus(7, ChronoUnit.DAYS);

        long messagesLast24h = allMessages.stream()
                .filter(m -> m.getCreatedAt() != null && m.getCreatedAt().isAfter(last24h))
                .count();
        long messagesLast7d = allMessages.stream()
                .filter(m -> m.getCreatedAt() != null && m.getCreatedAt().isAfter(last7d))
                .count();

        // Group by hour for last 24h
        Map<Integer, Long> byHour = allMessages.stream()
                .filter(m -> m.getCreatedAt() != null && m.getCreatedAt().isAfter(last24h))
                .collect(Collectors.groupingBy(
                        m -> java.time.ZonedDateTime.ofInstant(m.getCreatedAt(), java.time.ZoneOffset.UTC).getHour(),
                        Collectors.counting()));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalMessages", allMessages.size(),
                "messagesLast24h", messagesLast24h,
                "messagesLast7d", messagesLast7d,
                "avgPerHourLast24h", messagesLast24h > 0 ? messagesLast24h / 24.0 : 0,
                "avgPerDayLast7d", messagesLast7d > 0 ? messagesLast7d / 7.0 : 0,
                "hourlyBreakdown", byHour
        )));
    }
}
