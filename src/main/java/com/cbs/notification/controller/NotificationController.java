package com.cbs.notification.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.notification.entity.*;
import com.cbs.notification.repository.NotificationLogRepository;
import com.cbs.notification.service.NotificationService;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
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
import java.util.stream.Collectors;

@RestController @RequestMapping("/v1/notifications") @RequiredArgsConstructor
@Tag(name = "Notifications", description = "Multi-channel notification engine with templates and preferences")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationLogRepository notificationLogRepository;
    private final com.cbs.notification.repository.NotificationTemplateRepository templateRepository;
    private final com.cbs.notification.repository.ChannelConfigRepository channelConfigRepository;
    private final CustomerRepository customerRepository;

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

    @PostMapping("/send-by-template")
    @Operation(summary = "Send notification using a template with merge data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendByTemplate(@RequestBody Map<String, Object> body) {
        Long templateId = body.get("templateId") instanceof Number ? ((Number) body.get("templateId")).longValue() : null;
        if (templateId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.ok(Map.of("error", "templateId is required")));
        }
        NotificationTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + templateId));

        @SuppressWarnings("unchecked")
        List<String> recipients = (List<String>) body.getOrDefault("recipients", List.of());
        @SuppressWarnings("unchecked")
        Map<String, String> mergeData = (Map<String, String>) body.getOrDefault("mergeData", Map.of());

        String resolvedBody = template.resolveBody(mergeData);
        String resolvedSubject = template.resolveSubject(mergeData);

        int sent = 0, failed = 0;
        for (String recipient : recipients) {
            try {
                notificationService.sendDirect(template.getChannel(), recipient, "",
                        resolvedSubject != null ? resolvedSubject : "", resolvedBody, null, template.getEventType());
                sent++;
            } catch (Exception e) { failed++; }
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("sent", sent, "failed", failed, "total", recipients.size())));
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
    @Operation(summary = "Send message to multiple customers. Supports explicit recipients[], broadcast=true, or segmentCode. "
            + "When templateCode is provided the body/subject are resolved per-recipient using the template's merge fields.")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendBulk(@RequestBody Map<String, Object> body) {
        String channel = String.valueOf(body.getOrDefault("channel", "EMAIL"));
        String fallbackSubject = String.valueOf(body.getOrDefault("subject", ""));
        String fallbackBody = String.valueOf(body.getOrDefault("body", ""));
        String eventType = String.valueOf(body.getOrDefault("eventType", "BULK"));
        NotificationChannel notifChannel = NotificationChannel.valueOf(channel);

        // Optional templateCode — when present, body/subject are resolved per-recipient
        // so merge fields like {{customerName}} are substituted server-side rather than
        // sent as literal text to every recipient.
        String templateCode = body.get("templateCode") != null ? String.valueOf(body.get("templateCode")) : null;
        NotificationTemplate bulkTemplate = null;
        if (templateCode != null && !templateCode.isBlank()) {
            bulkTemplate = templateRepository.findByTemplateCode(templateCode).orElse(null);
        }

        // Build recipient list from: explicit recipients[], broadcast flag, or segmentCode
        List<Map<String, Object>> recipientList = new ArrayList<>();

        boolean broadcast = Boolean.TRUE.equals(body.get("broadcast"));
        String segmentCode = body.get("segmentCode") != null ? String.valueOf(body.get("segmentCode")) : null;

        if (broadcast) {
            // Resolve all active customers
            Page<Customer> customers = customerRepository.findByStatus(CustomerStatus.ACTIVE, PageRequest.of(0, 10000));
            for (Customer c : customers.getContent()) {
                String addr = resolveRecipientAddress(c, notifChannel);
                if (addr != null && !addr.isBlank()) {
                    recipientList.add(Map.of("address", addr, "name", customerDisplayName(c), "customerId", c.getId()));
                }
            }
        } else if (segmentCode != null && !segmentCode.isBlank()) {
            // Resolve customers by segment — use customer type as a simple segment proxy
            Page<Customer> customers;
            try {
                customers = customerRepository.findByCustomerType(
                        com.cbs.customer.entity.CustomerType.valueOf(segmentCode), PageRequest.of(0, 10000));
            } catch (IllegalArgumentException e) {
                // Fall back to searching by status for other segment codes
                customers = customerRepository.findByStatus(CustomerStatus.ACTIVE, PageRequest.of(0, 10000));
            }
            for (Customer c : customers.getContent()) {
                String addr = resolveRecipientAddress(c, notifChannel);
                if (addr != null && !addr.isBlank()) {
                    recipientList.add(Map.of("address", addr, "name", customerDisplayName(c), "customerId", c.getId()));
                }
            }
        } else {
            // Explicit recipients from request body
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> explicit = (List<Map<String, Object>>) body.getOrDefault("recipients", java.util.Collections.emptyList());
            recipientList.addAll(explicit);
        }

        int sent = 0, failed = 0;
        final NotificationTemplate resolvedTemplate = bulkTemplate;
        for (Map<String, Object> r : recipientList) {
            try {
                String addr = String.valueOf(r.getOrDefault("address", ""));
                String name = String.valueOf(r.getOrDefault("name", ""));
                Long custId = r.get("customerId") instanceof Number ? ((Number) r.get("customerId")).longValue() : null;

                String resolvedBody;
                String resolvedSubject;
                if (resolvedTemplate != null) {
                    // Build per-recipient merge data from the recipient entry
                    Map<String, String> mergeData = new java.util.HashMap<>();
                    mergeData.put("customerName", name.isBlank() ? "Valued Customer" : name);
                    if (custId != null) mergeData.put("customerId", custId.toString());
                    mergeData.put("date", java.time.LocalDate.now().toString());
                    resolvedBody = resolvedTemplate.resolveBody(mergeData);
                    resolvedSubject = resolvedTemplate.resolveSubject(mergeData) != null
                            ? resolvedTemplate.resolveSubject(mergeData) : fallbackSubject;
                } else {
                    resolvedBody = fallbackBody;
                    resolvedSubject = fallbackSubject;
                }
                notificationService.sendDirect(notifChannel, addr, name, resolvedSubject, resolvedBody, custId, eventType);
                sent++;
            } catch (Exception e) { failed++; }
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("sent", sent, "failed", failed, "total", recipientList.size())));
    }

    private String resolveRecipientAddress(Customer c, NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> c.getEmail();
            case SMS -> c.getPhonePrimary();
            case PUSH, IN_APP -> c.getId() != null ? c.getId().toString() : null;
            case WEBHOOK -> null; // Webhooks don't target individual customers
        };
    }

    private String customerDisplayName(Customer c) {
        if (c.getFirstName() != null && c.getLastName() != null) {
            return c.getFirstName() + " " + c.getLastName();
        }
        if (c.getRegisteredName() != null) return c.getRegisteredName();
        return "Customer #" + c.getId();
    }

    @GetMapping("/templates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationTemplate>>> listTemplates(
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        List<NotificationTemplate> templates = notificationService.getAllTemplates();

        if (channel != null && !channel.isBlank()) {
            NotificationChannel ch = NotificationChannel.valueOf(channel);
            templates = templates.stream().filter(t -> t.getChannel() == ch).collect(Collectors.toList());
        }
        if (status != null && !status.isBlank()) {
            boolean active = "ACTIVE".equalsIgnoreCase(status);
            templates = templates.stream().filter(t -> Boolean.TRUE.equals(t.getIsActive()) == active).collect(Collectors.toList());
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            templates = templates.stream()
                    .filter(t -> (t.getTemplateName() != null && t.getTemplateName().toLowerCase().contains(q))
                            || (t.getTemplateCode() != null && t.getTemplateCode().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(ApiResponse.ok(templates));
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
    @Operation(summary = "Notification channel configuration — persisted in channel_config table")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChannelConfig>>> getChannels() {
        List<ChannelConfig> channels = channelConfigRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(channels));
    }

    @GetMapping("/delivery-stats")
    @Operation(summary = "Notification delivery success rates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeliveryStats(
            @RequestParam(required = false) Integer days) {
        List<NotificationLog> logs;
        if (days != null && days > 0) {
            Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
            logs = notificationLogRepository.findAll().stream()
                    .filter(n -> n.getCreatedAt() != null && n.getCreatedAt().isAfter(since))
                    .toList();
        } else {
            logs = notificationLogRepository.findAll();
        }
        long total = logs.size();
        long delivered = logs.stream().filter(n -> "DELIVERED".equals(n.getStatus()) || "READ".equals(n.getStatus()) || "SENT".equals(n.getStatus())).count();
        long failed = logs.stream().filter(n -> "FAILED".equals(n.getStatus()) || "BOUNCED".equals(n.getStatus())).count();
        long pending = logs.stream().filter(n -> "PENDING".equals(n.getStatus()) || "PENDING_DISPATCH".equals(n.getStatus())).count();
        double deliveryRate = total > 0 ? (double) delivered / total * 100.0 : 0.0;
        double failureRate = total > 0 ? (double) failed / total * 100.0 : 0.0;

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", total,
                "sent", total,
                "delivered", delivered,
                "failed", failed,
                "pending", pending,
                "deliveryRatePct", Math.round(deliveryRate * 100.0) / 100.0,
                "failureRatePct", Math.round(failureRate * 100.0) / 100.0
        )));
    }

    @GetMapping("/failures")
    @Operation(summary = "Failed notifications — filters by FAILED/BOUNCED status before pagination")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> getFailures(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NotificationLog> result = notificationLogRepository.findByStatusIn(
                List.of("FAILED", "BOUNCED"), pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/mark-all-read")
    @Operation(summary = "Get mark-all-read status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMarkAllReadStatus(
            @RequestParam(required = false) Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "READY")));
    }

    @PostMapping("/mark-all-read")
    @Operation(summary = "Mark all notifications as read for a customer. Only marks SENT/DELIVERED — "
            + "PENDING and PENDING_DISPATCH are not yet delivered to the recipient and must not be moved to READ.")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAllRead(
            @RequestParam(required = false) Long customerId) {
        // Only delivered messages (SENT or DELIVERED) count as "unread inbox items".
        // PENDING / PENDING_DISPATCH notifications have not reached the recipient yet
        // and must remain in their dispatch queue — marking them READ would hide them
        // from the delivery pipeline without ever actually delivering them.
        final List<String> readableStatuses = List.of("SENT", "DELIVERED");
        int marked = 0;
        if (customerId == null) {
            List<NotificationLog> unread = notificationLogRepository.findByStatusIn(readableStatuses);
            for (NotificationLog log : unread) {
                log.setStatus("READ");
                notificationLogRepository.save(log);
                marked++;
            }
        } else {
            Page<NotificationLog> notifications = notificationService.getCustomerNotifications(customerId,
                    PageRequest.of(0, 1000));
            for (NotificationLog log : notifications.getContent()) {
                if (readableStatuses.contains(log.getStatus())) {
                    log.setStatus("READ");
                    notificationLogRepository.save(log);
                    marked++;
                }
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("markedAsRead", marked)));
    }

    @GetMapping("/scheduled")
    @Operation(summary = "List scheduled notification campaigns")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ScheduledNotification>>> getScheduledNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getAllScheduledNotifications()));
    }

    @PostMapping("/scheduled")
    @Operation(summary = "Create a scheduled notification campaign")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ScheduledNotification>> createScheduledNotification(@RequestBody ScheduledNotification schedule) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(notificationService.createScheduledNotification(schedule)));
    }

    @DeleteMapping("/scheduled/{id}")
    @Operation(summary = "Delete a scheduled notification")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteScheduledNotification(@PathVariable Long id) {
        notificationService.deleteScheduledNotification(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "deleted", "true")));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Unread notification count for a customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @RequestParam(required = false) Long customerId) {
        if (customerId == null) {
            long unread = notificationLogRepository.countByStatusNot("READ");
            return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", unread)));
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
    @Operation(summary = "Update a template (saves previous body as a version)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationTemplate>> updateTemplate(@PathVariable Long id, @RequestBody NotificationTemplate template) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.updateTemplateWithVersion(id, template, "admin")));
    }

    @GetMapping("/templates/{id}/versions")
    @Operation(summary = "Get version history of a template")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationTemplateVersion>>> getTemplateVersions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getTemplateVersions(id)));
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

    @PostMapping("/templates/{id}/clone")
    @Operation(summary = "Clone a template as a new DRAFT")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<NotificationTemplate>> cloneTemplate(@PathVariable Long id) {
        NotificationTemplate source = templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id));
        NotificationTemplate clone = new NotificationTemplate();
        clone.setTemplateCode(source.getTemplateCode() + "_COPY_" + System.currentTimeMillis());
        clone.setTemplateName(source.getTemplateName() + " (Copy)");
        clone.setChannel(source.getChannel());
        clone.setEventType(source.getEventType());
        clone.setSubject(source.getSubject());
        clone.setBodyTemplate(source.getBodyTemplate());
        clone.setIsHtml(source.getIsHtml());
        clone.setLocale(source.getLocale());
        clone.setIsActive(false); // New clone starts as draft/inactive
        clone.setCreatedAt(Instant.now());
        clone.setUpdatedAt(Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(templateRepository.save(clone)));
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
    @Operation(summary = "Update channel configuration — persisted to channel_config table")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ChannelConfig>> updateChannel(
            @PathVariable String channel, @RequestBody Map<String, Object> body) {
        NotificationChannel ch = NotificationChannel.valueOf(channel);
        ChannelConfig cfg = channelConfigRepository.findByChannel(ch)
                .orElseThrow(() -> new ResourceNotFoundException("ChannelConfig", "channel", channel));

        if (body.containsKey("enabled")) cfg.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        if (body.containsKey("provider")) cfg.setProvider(String.valueOf(body.get("provider")));
        if (body.containsKey("senderAddress")) cfg.setSenderAddress(String.valueOf(body.get("senderAddress")));
        if (body.containsKey("apiKey")) cfg.setApiKey(String.valueOf(body.get("apiKey")));
        if (body.containsKey("apiSecret")) cfg.setApiSecret(String.valueOf(body.get("apiSecret")));
        if (body.containsKey("webhookUrl")) cfg.setWebhookUrl(String.valueOf(body.get("webhookUrl")));
        if (body.containsKey("rateLimit") && body.get("rateLimit") instanceof Number n) cfg.setRateLimit(n.intValue());
        if (body.containsKey("retryEnabled")) cfg.setRetryEnabled(Boolean.TRUE.equals(body.get("retryEnabled")));
        if (body.containsKey("maxRetries") && body.get("maxRetries") instanceof Number n) cfg.setMaxRetries(n.intValue());
        @SuppressWarnings("unchecked")
        Map<String, Object> extraConfig = body.containsKey("config") && body.get("config") instanceof Map
                ? (Map<String, Object>) body.get("config") : null;
        if (extraConfig != null) cfg.setConfig(extraConfig);

        cfg.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(channelConfigRepository.save(cfg)));
    }

    @PostMapping("/channels/{channel}/test")
    @Operation(summary = "Test channel delivery — sends a real test notification through the configured provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testChannel(@PathVariable String channel, @RequestBody Map<String, String> body) {
        NotificationChannel ch = NotificationChannel.valueOf(channel);
        ChannelConfig cfg = channelConfigRepository.findByChannel(ch).orElse(null);
        if (cfg == null || !Boolean.TRUE.equals(cfg.getEnabled())) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("success", false, "error", "Channel " + channel + " is disabled or not configured")));
        }

        String recipient = body.getOrDefault("recipient", "test@example.com");
        try {
            NotificationLog testLog = notificationService.sendDirect(ch, recipient, "Test Recipient",
                    "DigiCore CBS Channel Test", "This is a test notification from DigiCore CBS to verify " + channel + " channel delivery.",
                    null, "CHANNEL_TEST");
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "success", true, "channel", channel, "recipient", recipient,
                    "messageId", testLog.getProviderMessageId() != null ? testLog.getProviderMessageId() : "test-" + testLog.getId(),
                    "status", testLog.getStatus()
            )));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("success", false, "channel", channel, "recipient", recipient, "error", e.getMessage())));
        }
    }

    // ========================================================================
    // DELIVERY STATS DETAIL ENDPOINTS
    // ========================================================================

    @GetMapping("/delivery-stats/failures")
    @Operation(summary = "Recent delivery failures")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotificationLog>>> getDeliveryFailures() {
        Pageable pageable = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NotificationLog> result = notificationLogRepository.findByStatusIn(
                List.of("FAILED", "BOUNCED"), pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent()));
    }

    @GetMapping("/delivery-stats/trend")
    @Operation(summary = "Delivery trend computed from actual notification logs")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDeliveryTrend(
            @RequestParam(defaultValue = "30") int days) {
        int trendDays = Math.min(Math.max(days, 1), 365);
        Instant since = Instant.now().minus(trendDays, ChronoUnit.DAYS);
        List<NotificationLog> logs = notificationLogRepository.findAll().stream()
                .filter(n -> n.getCreatedAt() != null && n.getCreatedAt().isAfter(since))
                .toList();

        // Group by date string (YYYY-MM-DD)
        Map<String, List<NotificationLog>> byDate = logs.stream()
                .collect(Collectors.groupingBy(n -> n.getCreatedAt().truncatedTo(ChronoUnit.DAYS).toString()));

        List<Map<String, Object>> trend = new ArrayList<>();
        Instant now = Instant.now();
        for (int i = trendDays - 1; i >= 0; i--) {
            String dayKey = now.minus(i, ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS).toString();
            List<NotificationLog> dayLogs = byDate.getOrDefault(dayKey, List.of());
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", dayKey);
            entry.put("delivered", dayLogs.stream().filter(n -> "DELIVERED".equals(n.getStatus()) || "SENT".equals(n.getStatus())).count());
            entry.put("failed", dayLogs.stream().filter(n -> "FAILED".equals(n.getStatus()) || "BOUNCED".equals(n.getStatus())).count());
            entry.put("pending", dayLogs.stream().filter(n -> "PENDING".equals(n.getStatus())).count());
            trend.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @GetMapping("/delivery-stats/by-channel")
    @Operation(summary = "Delivery stats by channel computed from actual notification logs")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDeliveryByChannel() {
        List<NotificationLog> all = notificationLogRepository.findAll();

        Map<NotificationChannel, List<NotificationLog>> grouped = all.stream()
                .filter(n -> n.getChannel() != null)
                .collect(Collectors.groupingBy(NotificationLog::getChannel));

        List<Map<String, Object>> byChannel = new ArrayList<>();
        for (NotificationChannel ch : NotificationChannel.values()) {
            List<NotificationLog> chLogs = grouped.getOrDefault(ch, List.of());
            long sent = chLogs.size(); // total dispatched through this channel
            long delivered = chLogs.stream().filter(n -> "DELIVERED".equals(n.getStatus()) || "READ".equals(n.getStatus()) || "SENT".equals(n.getStatus())).count();
            long failed = chLogs.stream().filter(n -> "FAILED".equals(n.getStatus()) || "BOUNCED".equals(n.getStatus())).count();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("channel", ch.name());
            entry.put("sent", sent);
            entry.put("delivered", delivered);
            entry.put("failed", failed);
            byChannel.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(byChannel));
    }

    // ========================================================================
    // SCHEDULED NOTIFICATION TOGGLE
    // ========================================================================

    @PutMapping("/scheduled/{id}/toggle")
    @Operation(summary = "Toggle scheduled notification (ACTIVE ↔ PAUSED)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ScheduledNotification>> toggleScheduled(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.toggleScheduledNotification(id)));
    }

    // ========================================================================
    // SINGLE NOTIFICATION ACTIONS
    // ========================================================================

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a single notification as read")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> markAsRead(@PathVariable Long id) {
        NotificationLog log = notificationLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
        log.setStatus("READ");
        notificationLogRepository.save(log);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "READ")));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a notification")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteNotification(@PathVariable Long id) {
        notificationLogRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "deleted", "true")));
    }

    // ── Helper: project NotificationLog → FailureRecord shape expected by frontend ──

    private Map<String, Object> toFailureRecord(NotificationLog log) {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("id", log.getId());
        record.put("templateCode", log.getTemplateCode());
        record.put("channel", log.getChannel() != null ? log.getChannel().name() : null);
        record.put("recipientAddress", log.getRecipientAddress());
        record.put("failureReason", log.getFailureReason());
        record.put("createdAt", log.getCreatedAt() != null ? log.getCreatedAt().toString() : null);
        record.put("status", log.getStatus());
        return record;
    }
}
