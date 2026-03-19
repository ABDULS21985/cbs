package com.cbs.communications.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.notification.entity.NotificationLog;
import com.cbs.notification.entity.NotificationTemplate;
import com.cbs.notification.repository.NotificationLogRepository;
import com.cbs.notification.repository.NotificationTemplateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/communications")
@RequiredArgsConstructor
@Tag(name = "Communications", description = "Communications management - sent, scheduled, templates")
public class CommunicationsController {

    private final NotificationLogRepository notificationLogRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;

    @GetMapping
    @Operation(summary = "List all communications sent")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> listCommunications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<NotificationLog> result = notificationLogRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Communication stats: sent, delivered, failed counts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        long total = notificationLogRepository.count();
        long sent = notificationLogRepository.countByStatus("SENT");
        long delivered = notificationLogRepository.countByStatus("DELIVERED");
        long failed = notificationLogRepository.countByStatus("FAILED");
        long pending = notificationLogRepository.countByStatus("PENDING");

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", total,
                "sent", sent,
                "delivered", delivered,
                "failed", failed,
                "pending", pending
        )));
    }

    @GetMapping("/schedule")
    @Operation(summary = "List scheduled communications")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> getScheduled(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<NotificationLog> result = notificationLogRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "scheduledAt")));
        List<NotificationLog> scheduled = result.getContent().stream()
                .filter(n -> n.getScheduledAt() != null && "PENDING".equals(n.getStatus()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(scheduled, PageMeta.from(result)));
    }

    @GetMapping("/templates")
    @Operation(summary = "List communication templates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationTemplate>>> getTemplates() {
        List<NotificationTemplate> templates = notificationTemplateRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(templates));
    }
}
