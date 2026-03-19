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
            dispatchNotification(notifLog);
            queued.add(notifLog);
        }

        return queued;
    }

    /**
     * Attempt to dispatch a notification through its configured channel.
     * If no provider is configured for the channel, the status stays PENDING_DISPATCH
     * and a warning is logged so operators know action is required.
     */
    private void dispatchNotification(NotificationLog notifLog) {
        switch (notifLog.getChannel()) {
            case EMAIL -> {
                // JavaMailSender / SendGrid not configured (spring-boot-starter-mail absent).
                // To enable: add spring-boot-starter-mail to build.gradle.kts, configure
                // spring.mail.* properties, inject JavaMailSender, and send via
                // MimeMessageHelper.
                log.warn("Notification dispatch not configured — email notification #{} queued (channel=EMAIL, recipient={})",
                        notifLog.getId(), notifLog.getRecipientAddress());
            }
            case SMS -> {
                // No SMS provider (Twilio, Africa's Talking, SMPP) found in the project.
                // To enable: add the provider's SDK, configure credentials, and implement
                // SMS dispatch here.
                log.warn("Notification dispatch not configured — SMS notification #{} queued (channel=SMS, recipient={})",
                        notifLog.getId(), notifLog.getRecipientAddress());
            }
            case PUSH -> {
                // Firebase Cloud Messaging or similar push provider not configured.
                log.warn("Notification dispatch not configured — push notification #{} queued (channel=PUSH, recipient={})",
                        notifLog.getId(), notifLog.getRecipientAddress());
            }
            case IN_APP -> {
                // In-app notifications are stored in the log and surfaced via
                // getCustomerNotifications(). No external dispatch required.
                notifLog.setStatus("DELIVERED");
                notifLog.setSentAt(Instant.now());
                notifLog.setDeliveredAt(Instant.now());
                logRepository.save(notifLog);
                log.debug("In-app notification #{} stored for customer {}", notifLog.getId(), notifLog.getCustomerId());
            }
            case WEBHOOK -> {
                // Webhook delivery is handled by EsbService / HTTP client integration.
                // Mark as PENDING_DISPATCH for the ESB to pick up.
                log.warn("Notification dispatch not configured — webhook notification #{} queued for url={}",
                        notifLog.getId(), notifLog.getRecipientAddress());
            }
        }
    }

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
        dispatchNotification(notifLog);
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
                // Re-attempt dispatch; dispatchNotification will update status on success
                dispatchNotification(notif);
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
}
