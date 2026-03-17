package com.cbs.notification.service;

import com.cbs.common.exception.ResourceNotFoundException;
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
     */
    @Transactional
    public List<NotificationLog> sendEventNotification(String eventType, Long customerId,
                                                         String recipientEmail, String recipientPhone,
                                                         String recipientName, Map<String, String> params) {
        List<NotificationTemplate> templates = templateRepository.findByEventTypeAndIsActiveTrue(eventType);
        List<NotificationLog> sent = new ArrayList<>();

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
                    .status("SENT").sentAt(Instant.now())
                    .provider(resolveProvider(template.getChannel()))
                    .build();

            // In production: dispatch to actual provider (SendGrid, Twilio, Firebase, etc.)
            // For now, mark as SENT immediately
            sent.add(logRepository.save(notifLog));
            log.info("Notification sent: channel={}, event={}, recipient={}", template.getChannel(), eventType, recipientAddress);
        }

        return sent;
    }

    /**
     * Send a direct notification without template lookup.
     */
    @Transactional
    public NotificationLog sendDirect(NotificationChannel channel, String recipientAddress,
                                        String recipientName, String subject, String body,
                                        Long customerId, String eventType) {
        NotificationLog notifLog = NotificationLog.builder()
                .channel(channel).eventType(eventType != null ? eventType : "DIRECT")
                .customerId(customerId).recipientAddress(recipientAddress)
                .recipientName(recipientName).subject(subject).body(body)
                .status("SENT").sentAt(Instant.now())
                .provider(resolveProvider(channel)).build();
        return logRepository.save(notifLog);
    }

    @Transactional
    public int retryFailedNotifications() {
        List<NotificationLog> pending = logRepository.findPendingForRetry();
        int retried = 0;
        for (NotificationLog notif : pending) {
            try {
                notif.setRetryCount(notif.getRetryCount() + 1);
                // In production: re-dispatch to provider
                notif.setStatus("SENT");
                notif.setSentAt(Instant.now());
                logRepository.save(notif);
                retried++;
            } catch (Exception e) {
                if (notif.getRetryCount() >= notif.getMaxRetries()) {
                    notif.setStatus("FAILED");
                    notif.setFailureReason("Max retries exceeded: " + e.getMessage());
                }
                logRepository.save(notif);
            }
        }
        log.info("Notification retry: {} of {} retried", retried, pending.size());
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
}
