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

    @PostMapping("/send")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> sendEvent(
            @RequestParam String eventType, @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String email, @RequestParam(required = false) String phone,
            @RequestParam(required = false) String name, @RequestBody Map<String, String> params) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.sendEventNotification(eventType, customerId, email, phone, name, params)));
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
}
