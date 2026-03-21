package com.cbs.notification.service;

import com.cbs.notification.entity.*;
import com.cbs.notification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationTemplateRepository templateRepository;
    private final NotificationLogRepository logRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final NotificationTemplateVersionRepository templateVersionRepository;
    private final ScheduledNotificationRepository scheduledNotificationRepository;
    private final NotificationDispatcher dispatcher;

    /**
     * Sends notifications for a business event across all configured channels.
     * Respects customer opt-out preferences.
     *
     * Notifications are saved with status PENDING_DISPATCH until a real provider
     * is configured and confirms delivery. No provider (JavaMailSender, SMS gateway,
     * push service) is wired in this deployment, so dispatch is not attempted here.
     */
    @Transactional
    public List<NotificationLog> sendEventNotification(String eventType, Long customerId,
                                                         String recipientEmail, String recipientPhone,
                                                         String recipientName, Map<String, String> params) {
        List<NotificationTemplate> templates = templateRepository.findByEventTypeAndIsActiveTrue(eventType);
        List<NotificationLog> queued = new ArrayList<>();

        for (NotificationTemplate template : templates) {
            // Check opt-out preference
            if (customerId != null && isOptedOut(customerId, template.getChannel(), eventType)) {
                log.debug("Customer {} opted out of {} for {}", customerId, template.getChannel(), eventType);
                continue;
            }

            String recipientAddress = switch (template.getChannel()) {
                case EMAIL -> recipientEmail;
                case SMS -> recipientPhone;
                case PUSH, IN_APP -> customerId != null ? customerId.toString() : recipientEmail;
                case WEBHOOK -> params.getOrDefault("webhook_url", "");
            };

            if (recipientAddress == null || recipientAddress.isEmpty()) continue;

            String resolvedBody = template.resolveBody(params);
            String resolvedSubject = template.resolveSubject(params);

            NotificationLog notifLog = NotificationLog.builder()
                    .templateCode(template.getTemplateCode())
                    .channel(template.getChannel()).eventType(eventType)
                    .customerId(customerId).recipientAddress(recipientAddress)
                    .recipientName(recipientName)
                    .subject(resolvedSubject).body(resolvedBody)
                    .status("PENDING_DISPATCH")
                    .provider(resolveProvider(template.getChannel()))
                    .build();

            notifLog = logRepository.save(notifLog);
            dispatcher.dispatch(notifLog);
            queued.add(notifLog);
        }

        return queued;
    }

    // Dispatch is now handled by NotificationDispatcher bean

    /**
     * Send a direct notification without template lookup.
     * Status is PENDING_DISPATCH until a provider actually delivers it.
     */
    @Transactional
    public NotificationLog sendDirect(NotificationChannel channel, String recipientAddress,
                                        String recipientName, String subject, String body,
                                        Long customerId, String eventType) {
        NotificationLog notifLog = NotificationLog.builder()
                .channel(channel).eventType(eventType != null ? eventType : "DIRECT")
                .customerId(customerId).recipientAddress(recipientAddress)
                .recipientName(recipientName).subject(subject).body(body)
                .status("PENDING_DISPATCH")
                .provider(resolveProvider(channel)).build();
        notifLog = logRepository.save(notifLog);
        dispatcher.dispatch(notifLog);
        return notifLog;
    }

    public Map<String, Object> buildWebhookPayload(WebhookEvent event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventType", event.eventType());
        payload.put("paymentRef", event.paymentRef());
        payload.put("amount", event.amount());
        payload.put("currency", event.currency());
        payload.put("status", event.status());
        payload.put("timestamp", event.timestamp());
        return payload;
    }

    public List<Instant> getWebhookRetrySchedule(Instant startTime) {
        return List.of(
                startTime,
                startTime.plusSeconds(30),
                startTime.plusSeconds(120)
        );
    }

    public NotificationLog registerDeliveryFailure(NotificationLog notification, String reason, Instant occurredAt) {
        int nextRetryCount = notification.getRetryCount() + 1;
        notification.setRetryCount(nextRetryCount);
        notification.setFailureReason(reason);

        if (nextRetryCount >= notification.getMaxRetries()) {
            notification.setStatus("FAILED");
            notification.setScheduledAt(null);
        } else {
            notification.setStatus("PENDING");
            notification.setScheduledAt(nextRetryCount == 1
                    ? occurredAt.plusSeconds(30)
                    : occurredAt.plusSeconds(120));
        }
        return notification;
    }

    @Transactional
    public int retryFailedNotifications() {
        List<NotificationLog> pending = logRepository.findPendingForRetry();
        int retried = 0;
        for (NotificationLog notif : pending) {
            try {
                notif.setRetryCount(notif.getRetryCount() + 1);
                notif.setStatus("PENDING_DISPATCH");
                logRepository.save(notif);
                dispatcher.dispatch(notif);
                retried++;
            } catch (Exception e) {
                registerDeliveryFailure(notif, e.getMessage(), Instant.now());
                logRepository.save(notif);
            }
        }
        log.info("Notification retry: {} of {} re-dispatched", retried, pending.size());
        return retried;
    }

    // Preferences
    @Transactional
    public NotificationPreference updatePreference(Long customerId, NotificationChannel channel,
                                                      String eventType, boolean enabled) {
        NotificationPreference pref = preferenceRepository
                .findByCustomerIdAndChannelAndEventType(customerId, channel, eventType)
                .orElse(NotificationPreference.builder()
                        .customerId(customerId).channel(channel).eventType(eventType).build());
        pref.setIsEnabled(enabled);
        pref.setUpdatedAt(Instant.now());
        return preferenceRepository.save(pref);
    }

    public List<NotificationPreference> getPreferences(Long customerId) {
        return preferenceRepository.findByCustomerId(customerId);
    }

    public Page<NotificationLog> getCustomerNotifications(Long customerId, Pageable pageable) {
        return logRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    // Templates
    @Transactional
    public NotificationTemplate createTemplate(NotificationTemplate template) {
        return templateRepository.save(template);
    }

    private boolean isOptedOut(Long customerId, NotificationChannel channel, String eventType) {
        return preferenceRepository.findByCustomerIdAndChannelAndEventType(customerId, channel, eventType)
                .map(p -> !Boolean.TRUE.equals(p.getIsEnabled())).orElse(false);
    }

    private String resolveProvider(NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> "SMTP_DEFAULT";
            case SMS -> "SMS_DEFAULT";
            case PUSH -> "FCM";
            case IN_APP -> "INTERNAL";
            case WEBHOOK -> "HTTP_CLIENT";
        };
    }

    public record WebhookEvent(
            String eventType,
            String paymentRef,
            Object amount,
            String currency,
            String status,
            Instant timestamp
    ) {}

    public List<NotificationTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    // ========================================================================
    // TEMPLATE VERSIONING
    // ========================================================================

    /**
     * Saves the current template body as a version snapshot before it is overwritten.
     */
    @Transactional
    public NotificationTemplate updateTemplateWithVersion(Long id, NotificationTemplate incoming, String changedBy) {
        NotificationTemplate existing = templateRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Template not found: " + id));

        // Snapshot the previous body as a version
        int nextVersion = templateVersionRepository.findMaxVersionNumber(id).orElse(0) + 1;
        templateVersionRepository.save(NotificationTemplateVersion.builder()
                .templateId(id)
                .versionNumber(nextVersion)
                .bodyTemplate(existing.getBodyTemplate())
                .subject(existing.getSubject())
                .changedBy(changedBy)
                .changeSummary("Version " + nextVersion + " before update")
                .build());

        // Apply changes
        if (incoming.getTemplateName() != null) existing.setTemplateName(incoming.getTemplateName());
        if (incoming.getSubject() != null) existing.setSubject(incoming.getSubject());
        if (incoming.getBodyTemplate() != null) existing.setBodyTemplate(incoming.getBodyTemplate());
        if (incoming.getEventType() != null) existing.setEventType(incoming.getEventType());
        if (incoming.getChannel() != null) existing.setChannel(incoming.getChannel());
        if (incoming.getIsHtml() != null) existing.setIsHtml(incoming.getIsHtml());
        if (incoming.getLocale() != null) existing.setLocale(incoming.getLocale());
        existing.setUpdatedAt(Instant.now());
        return templateRepository.save(existing);
    }

    public List<NotificationTemplateVersion> getTemplateVersions(Long templateId) {
        return templateVersionRepository.findByTemplateIdOrderByVersionNumberDesc(templateId);
    }

    // ========================================================================
    // SCHEDULED NOTIFICATIONS
    // ========================================================================

    public List<ScheduledNotification> getAllScheduledNotifications() {
        return scheduledNotificationRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public ScheduledNotification createScheduledNotification(ScheduledNotification schedule) {
        schedule.setCreatedAt(Instant.now());
        schedule.setUpdatedAt(Instant.now());
        return scheduledNotificationRepository.save(schedule);
    }

    @Transactional
    public ScheduledNotification toggleScheduledNotification(Long id) {
        ScheduledNotification sn = scheduledNotificationRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Schedule not found: " + id));
        sn.setStatus("ACTIVE".equals(sn.getStatus()) ? "PAUSED" : "ACTIVE");
        sn.setUpdatedAt(Instant.now());
        return scheduledNotificationRepository.save(sn);
    }

    @Transactional
    public void deleteScheduledNotification(Long id) {
        scheduledNotificationRepository.deleteById(id);
    }

}
