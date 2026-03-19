package com.cbs.audit.controller;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.entity.AuditEvent;
import com.cbs.audit.repository.AuditEventRepository;
import com.cbs.audit.service.AuditService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequestMapping("/v1/audit") @RequiredArgsConstructor
@Tag(name = "Audit Trail", description = "Compliance-grade audit event log with before/after state capture")
public class AuditController {

    private final AuditService auditService;
    private final AuditEventRepository auditEventRepository;

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getEntityTrail(@PathVariable String entityType, @PathVariable Long entityId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AuditEvent> result = auditService.getEntityAuditTrail(entityType, entityId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/user/{performedBy}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getUserTrail(@PathVariable String performedBy,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AuditEvent> result = auditService.getUserAuditTrail(performedBy, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/action/{action}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getByAction(@PathVariable AuditAction action,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AuditEvent> result = auditService.getByAction(action, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // AUDIT EXTENDED ENDPOINTS
    // ========================================================================

    @GetMapping("/search")
    @Operation(summary = "Search audit events with filters")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> searchAuditEvents(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String performedBy,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AuditEvent> result;
        if (entityType != null && performedBy == null) {
            result = auditEventRepository.findByEventTypeOrderByEventTimestampDesc(entityType,
                    PageRequest.of(page, size));
        } else if (performedBy != null) {
            result = auditEventRepository.findByPerformedByOrderByEventTimestampDesc(performedBy,
                    PageRequest.of(page, size));
        } else if (action != null) {
            result = auditEventRepository.findByActionOrderByEventTimestampDesc(action,
                    PageRequest.of(page, size));
        } else {
            result = auditEventRepository.findAll(
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eventTimestamp")));
        }
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/summary")
    @Operation(summary = "Audit summary - events by type and by user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditSummary() {
        List<AuditEvent> allEvents = auditEventRepository.findAll();

        Map<String, Long> byAction = allEvents.stream()
                .filter(e -> e.getAction() != null)
                .collect(Collectors.groupingBy(e -> e.getAction().name(), Collectors.counting()));

        Map<String, Long> byEntityType = allEvents.stream()
                .filter(e -> e.getEntityType() != null)
                .collect(Collectors.groupingBy(AuditEvent::getEntityType, Collectors.counting()));

        Map<String, Long> byUser = allEvents.stream()
                .filter(e -> e.getPerformedBy() != null)
                .collect(Collectors.groupingBy(AuditEvent::getPerformedBy, Collectors.counting()));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalEvents", allEvents.size(),
                "byAction", byAction,
                "byEntityType", byEntityType,
                "byUser", byUser
        )));
    }

    @GetMapping("/user-activity")
    @Operation(summary = "Activity log for a specific user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getUserActivity(
            @RequestParam(required = false) String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        Page<AuditEvent> result = auditService.getUserAuditTrail(userId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/user-heatmap")
    @Operation(summary = "User activity heatmap (hour of day x day of week)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserHeatmap(
            @RequestParam(required = false) String userId) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("userId", "", "totalEvents", 0L, "heatmap", Map.of())));
        }
        Page<AuditEvent> events = auditService.getUserAuditTrail(userId, PageRequest.of(0, 10000));

        // Build heatmap: dayOfWeek -> hour -> count
        Map<String, Map<Integer, Long>> heatmap = new LinkedHashMap<>();
        String[] days = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"};
        for (String day : days) {
            heatmap.put(day, new LinkedHashMap<>());
            for (int h = 0; h < 24; h++) {
                heatmap.get(day).put(h, 0L);
            }
        }

        for (AuditEvent event : events.getContent()) {
            if (event.getEventTimestamp() != null) {
                var zdt = event.getEventTimestamp().atZone(ZoneOffset.UTC);
                String day = zdt.getDayOfWeek().name();
                int hour = zdt.getHour();
                heatmap.get(day).merge(hour, 1L, Long::sum);
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "userId", userId,
                "totalEvents", events.getTotalElements(),
                "heatmap", heatmap
        )));
    }

    @GetMapping("/related")
    @Operation(summary = "Audit events related to a specific entity")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getRelatedEvents(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (entityType == null || entityId == null) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        Page<AuditEvent> result = auditService.getEntityAuditTrail(entityType, entityId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
