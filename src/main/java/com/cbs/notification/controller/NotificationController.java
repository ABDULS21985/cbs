package com.cbs.notification.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.notification.entity.*;
import com.cbs.notification.repository.NotificationLogRepository;
import com.cbs.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/notifications") @RequiredArgsConstructor
@Tag(name = "Notifications", description = "Multi-channel notification engine with templates and preferences")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationLogRepository notificationLogRepository;

    @GetMapping("/send")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getSendInfo() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
    }

    @PostMapping("/send")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> sendEvent(
            @RequestParam String eventType, @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String email, @RequestParam(required = false) String phone,
            @RequestParam(required = false) String name, @RequestBody Map<String, String> params) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.sendEventNotification(eventType, customerId, email, phone, name, params)));
    }

    @GetMapping("/templates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationTemplate>>> listTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getAllTemplates()));
    }

    @PostMapping("/templates")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationTemplate>> createTemplate(@RequestBody NotificationTemplate template) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(notificationService.createTemplate(template)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> getCustomerNotifications(
            @PathVariable Long customerId, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<NotificationLog> result = notificationService.getCustomerNotifications(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/preferences")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<NotificationPreference>>> listAllPreferences(
            @RequestParam(required = false) Long customerId) {
        if (customerId != null) {
            return ResponseEntity.ok(ApiResponse.ok(notificationService.getPreferences(customerId)));
        }
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PutMapping("/preferences")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<NotificationPreference>> updatePreference(
            @RequestParam Long customerId, @RequestParam NotificationChannel channel,
            @RequestParam String eventType, @RequestParam boolean enabled) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.updatePreference(customerId, channel, eventType, enabled)));
    }

    @GetMapping("/preferences/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<NotificationPreference>>> getPreferences(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getPreferences(customerId)));
    }

    @GetMapping("/retry")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> getRetryStatus() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("retried", 0)));
    }

    @PostMapping("/retry")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> retry() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("retried", notificationService.retryFailedNotifications())));
    }

    // List all notifications
    @GetMapping
    @Operation(summary = "List all notifications")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> listNotifications(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NotificationLog> result = notificationLogRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // ========================================================================
    // NOTIFICATION EXTENDED ENDPOINTS
    // ========================================================================

    @GetMapping("/channels")
    @Operation(summary = "Notification channel configuration")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getChannels() {
        List<Map<String, Object>> channels = List.of(
                Map.of("channel", "EMAIL", "enabled", true, "provider", "SMTP"),
                Map.of("channel", "SMS", "enabled", true, "provider", "TWILIO"),
                Map.of("channel", "PUSH", "enabled", true, "provider", "FIREBASE"),
                Map.of("channel", "IN_APP", "enabled", true, "provider", "INTERNAL")
        );
        return ResponseEntity.ok(ApiResponse.ok(channels));
    }

    @GetMapping("/delivery-stats")
    @Operation(summary = "Notification delivery success rates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeliveryStats() {
        long total = notificationLogRepository.count();
        long sent = notificationLogRepository.countByStatus("SENT");
        long delivered = notificationLogRepository.countByStatus("DELIVERED");
        long failed = notificationLogRepository.countByStatus("FAILED");
        long pending = notificationLogRepository.countByStatus("PENDING");
        double deliveryRate = total > 0 ? (double) (sent + delivered) / total * 100.0 : 0.0;
        double failureRate = total > 0 ? (double) failed / total * 100.0 : 0.0;

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", total,
                "sent", sent,
                "delivered", delivered,
                "failed", failed,
                "pending", pending,
                "deliveryRatePct", Math.round(deliveryRate * 100.0) / 100.0,
                "failureRatePct", Math.round(failureRate * 100.0) / 100.0
        )));
    }

    @GetMapping("/failures")
    @Operation(summary = "Failed notifications")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> getFailures(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NotificationLog> result = notificationLogRepository.findAll(pageable);
        List<NotificationLog> failures = result.getContent().stream()
                .filter(n -> "FAILED".equals(n.getStatus()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(failures, PageMeta.from(result)));
    }

    @GetMapping("/mark-all-read")
    @Operation(summary = "Get mark-all-read status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMarkAllReadStatus(
            @RequestParam(required = false) Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
    }

    @PostMapping("/mark-all-read")
    @Operation(summary = "Mark all notifications as read for a customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAllRead(
            @RequestParam Long customerId) {
        Page<NotificationLog> notifications = notificationService.getCustomerNotifications(customerId,
                PageRequest.of(0, 1000));
        int marked = 0;
        for (NotificationLog log : notifications.getContent()) {
            if (!"READ".equals(log.getStatus()) && "DELIVERED".equals(log.getStatus())) {
                log.setStatus("READ");
                notificationLogRepository.save(log);
                marked++;
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("markedAsRead", marked)));
    }

    @GetMapping("/scheduled")
    @Operation(summary = "Scheduled notifications")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> getScheduledNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "scheduledAt"));
        Page<NotificationLog> result = notificationLogRepository.findAll(pageable);
        List<NotificationLog> scheduled = result.getContent().stream()
                .filter(n -> n.getScheduledAt() != null)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(scheduled, PageMeta.from(result)));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Unread notification count for a customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @RequestParam(required = false) Long customerId) {
        if (customerId == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", 0L)));
        }
        Page<NotificationLog> notifications = notificationService.getCustomerNotifications(customerId,
                PageRequest.of(0, 10000));
        long unread = notifications.getContent().stream()
                .filter(n -> !"READ".equals(n.getStatus()) && ("DELIVERED".equals(n.getStatus()) || "SENT".equals(n.getStatus())))
                .count();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", unread)));
    }
}
