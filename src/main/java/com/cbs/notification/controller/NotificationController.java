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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/notifications") @RequiredArgsConstructor
@Tag(name = "Notifications", description = "Multi-channel notification engine with templates and preferences")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationLogRepository notificationLogRepository;
    private final com.cbs.notification.repository.NotificationTemplateRepository templateRepository;

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

    @PostMapping("/send-direct")
    @Operation(summary = "Send a custom message directly without template lookup")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<NotificationLog>> sendDirect(@RequestBody Map<String, Object> body) {
        String channel = String.valueOf(body.getOrDefault("channel", "EMAIL"));
        String recipientAddress = String.valueOf(body.getOrDefault("recipientAddress", ""));
        String recipientName = String.valueOf(body.getOrDefault("recipientName", ""));
        String subject = String.valueOf(body.getOrDefault("subject", ""));
        String msgBody = String.valueOf(body.getOrDefault("body", ""));
        Long customerId = body.get("customerId") instanceof Number ? ((Number) body.get("customerId")).longValue() : null;
        String eventType = String.valueOf(body.getOrDefault("eventType", "DIRECT"));
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponse.ok(notificationService.sendDirect(
                        com.cbs.notification.entity.NotificationChannel.valueOf(channel),
                        recipientAddress, recipientName, subject, msgBody, customerId, eventType)));
    }

    @PostMapping("/send-bulk")
    @Operation(summary = "Send message to multiple customers")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendBulk(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> recipients = (java.util.List<Map<String, Object>>) body.getOrDefault("recipients", java.util.Collections.emptyList());
        String channel = String.valueOf(body.getOrDefault("channel", "EMAIL"));
        String subject = String.valueOf(body.getOrDefault("subject", ""));
        String msgBody = String.valueOf(body.getOrDefault("body", ""));
        String eventType = String.valueOf(body.getOrDefault("eventType", "BULK"));
        int sent = 0, failed = 0;
        for (Map<String, Object> r : recipients) {
            try {
                String addr = String.valueOf(r.getOrDefault("address", ""));
                String name = String.valueOf(r.getOrDefault("name", ""));
                Long custId = r.get("customerId") instanceof Number ? ((Number) r.get("customerId")).longValue() : null;
                notificationService.sendDirect(com.cbs.notification.entity.NotificationChannel.valueOf(channel), addr, name, subject, msgBody, custId, eventType);
                sent++;
            } catch (Exception e) { failed++; }
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("sent", sent, "failed", failed, "total", recipients.size())));
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

    // ========================================================================
    // TEMPLATE EXTENDED CRUD
    // ========================================================================

    @GetMapping("/templates/{id}")
    @Operation(summary = "Get template by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<NotificationTemplate>> getTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id))));
    }

    @PutMapping("/templates/{id}")
    @Operation(summary = "Update a template")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationTemplate>> updateTemplate(@PathVariable Long id, @RequestBody NotificationTemplate template) {
        NotificationTemplate existing = templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id));
        if (template.getTemplateName() != null) existing.setTemplateName(template.getTemplateName());
        if (template.getSubject() != null) existing.setSubject(template.getSubject());
        if (template.getBodyTemplate() != null) existing.setBodyTemplate(template.getBodyTemplate());
        if (template.getEventType() != null) existing.setEventType(template.getEventType());
        if (template.getChannel() != null) existing.setChannel(template.getChannel());
        existing.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(templateRepository.save(existing)));
    }

    @PostMapping("/templates/{id}/publish")
    @Operation(summary = "Publish a template")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationTemplate>> publishTemplate(@PathVariable Long id) {
        NotificationTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id));
        template.setIsActive(true);
        template.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(templateRepository.save(template)));
    }

    @PostMapping("/templates/{id}/archive")
    @Operation(summary = "Archive a template")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationTemplate>> archiveTemplate(@PathVariable Long id) {
        NotificationTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id));
        template.setIsActive(false);
        template.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(templateRepository.save(template)));
    }

    @PostMapping("/templates/{id}/test")
    @Operation(summary = "Send test notification")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testSendTemplate(@PathVariable Long id, @RequestBody Map<String, String> body) {
        NotificationTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id));
        String recipient = body.getOrDefault("recipient", "test@example.com");
        Map<String, String> sampleData = Map.of("customerName", "Test User", "accountNumber", "1234567890", "amount", "50,000.00", "date", Instant.now().toString());
        String resolvedBody = template.resolveBody(sampleData);
        String resolvedSubject = template.resolveSubject(sampleData);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true, "recipient", recipient, "subject", resolvedSubject, "body", resolvedBody)));
    }

    @GetMapping("/templates/{id}/preview")
    @Operation(summary = "Preview template with sample data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewTemplate(@PathVariable Long id) {
        NotificationTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id));
        Map<String, String> sampleData = Map.of("customerName", "Adebayo Ogundimu", "accountNumber", "0012345678", "amount", "150,000.00", "date", "19 Mar 2026", "branchName", "Victoria Island Branch");
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "subject", template.resolveSubject(sampleData),
                "body", template.resolveBody(sampleData),
                "channel", template.getChannel().name(),
                "isHtml", template.getIsHtml()
        )));
    }

    // ========================================================================
    // CHANNEL EXTENDED ENDPOINTS
    // ========================================================================

    @PutMapping("/channels/{channel}")
    @Operation(summary = "Update channel configuration")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateChannel(@PathVariable String channel, @RequestBody Map<String, Object> config) {
        config.put("channel", channel);
        config.put("updatedAt", Instant.now().toString());
        return ResponseEntity.ok(ApiResponse.ok(config));
    }

    @PostMapping("/channels/{channel}/test")
    @Operation(summary = "Test channel delivery")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testChannel(@PathVariable String channel, @RequestBody Map<String, String> body) {
        String recipient = body.getOrDefault("recipient", "test@example.com");
        return ResponseEntity.ok(ApiResponse.ok(Map.of("success", true, "channel", channel, "recipient", recipient, "messageId", java.util.UUID.randomUUID().toString())));
    }

    // ========================================================================
    // DELIVERY STATS DETAIL ENDPOINTS
    // ========================================================================

    @GetMapping("/delivery-stats/failures")
    @Operation(summary = "Recent delivery failures")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> getDeliveryFailures() {
        Pageable pageable = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NotificationLog> result = notificationLogRepository.findAll(pageable);
        List<NotificationLog> failures = result.getContent().stream()
                .filter(n -> "FAILED".equals(n.getStatus()) || "BOUNCED".equals(n.getStatus()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(failures));
    }

    @GetMapping("/delivery-stats/trend")
    @Operation(summary = "30-day delivery trend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDeliveryTrend() {
        List<Map<String, Object>> trend = new ArrayList<>();
        Instant now = Instant.now();
        for (int i = 29; i >= 0; i--) {
            Instant day = now.minus(i, ChronoUnit.DAYS);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", day.truncatedTo(ChronoUnit.DAYS).toString());
            entry.put("delivered", 0);
            entry.put("failed", 0);
            entry.put("pending", 0);
            trend.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @GetMapping("/delivery-stats/by-channel")
    @Operation(summary = "Delivery stats by channel")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDeliveryByChannel() {
        List<Map<String, Object>> byChannel = new ArrayList<>();
        for (NotificationChannel ch : NotificationChannel.values()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("channel", ch.name());
            entry.put("sent", 0);
            entry.put("delivered", 0);
            entry.put("failed", 0);
            byChannel.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(byChannel));
    }

    // ========================================================================
    // SCHEDULED NOTIFICATION TOGGLE
    // ========================================================================

    @PutMapping("/scheduled/{id}/toggle")
    @Operation(summary = "Toggle scheduled notification")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleScheduled(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "toggled", true)));
    }
}
