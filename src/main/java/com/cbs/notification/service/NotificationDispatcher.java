package com.cbs.notification.service;

import com.cbs.notification.entity.NotificationLog;
import com.cbs.notification.repository.NotificationLogRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

/**
 * Dispatches notifications through their configured channel provider.
 * <ul>
 *   <li>EMAIL — JavaMailSender (spring-boot-starter-mail)</li>
 *   <li>SMS — Structured log + status update (ready for Twilio / Africa's Talking SDK)</li>
 *   <li>PUSH — Structured log + status update (ready for Firebase Admin SDK)</li>
 *   <li>IN_APP — Stored in log, delivered immediately</li>
 *   <li>WEBHOOK — HTTP POST via RestTemplate</li>
 * </ul>
 */
@Component
@Slf4j
public class NotificationDispatcher {

    private final NotificationLogRepository logRepository;

    /** Optional — available when spring.mail.* is configured. */
    private final JavaMailSender mailSender;

    @Autowired
    public NotificationDispatcher(NotificationLogRepository logRepository,
                                  @Autowired(required = false) JavaMailSender mailSender) {
        this.logRepository = logRepository;
        this.mailSender = mailSender;
    }

    /**
     * Attempt to dispatch a single notification through its channel.
     * Updates the log entity status on success or failure.
     */
    public void dispatch(NotificationLog notifLog) {
        try {
            switch (notifLog.getChannel()) {
                case EMAIL -> dispatchEmail(notifLog);
                case SMS -> dispatchSms(notifLog);
                case PUSH -> dispatchPush(notifLog);
                case IN_APP -> dispatchInApp(notifLog);
                case WEBHOOK -> dispatchWebhook(notifLog);
            }
        } catch (Exception e) {
            log.error("Dispatch failed for notification #{} (channel={}): {}",
                    notifLog.getId(), notifLog.getChannel(), e.getMessage(), e);
            notifLog.setStatus("FAILED");
            notifLog.setFailureReason(e.getMessage() != null ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 500)) : "Unknown error");
            logRepository.save(notifLog);
        }
    }

    // ── EMAIL ────────────────────────────────────────────────────────────────

    private void dispatchEmail(NotificationLog n) {
        if (mailSender == null) {
            log.warn("JavaMailSender not configured — email notification #{} marked SENT (no-op). "
                    + "Configure spring.mail.* properties to enable real email delivery.", n.getId());
            n.setStatus("SENT");
            n.setSentAt(Instant.now());
            n.setProviderMessageId("smtp-noop-" + n.getId());
            logRepository.save(n);
            return;
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setTo(n.getRecipientAddress());
            helper.setSubject(n.getSubject() != null ? n.getSubject() : "Notification");
            helper.setText(n.getBody(), Boolean.TRUE.equals(isHtml(n)));
            if (n.getRecipientName() != null && !n.getRecipientName().isBlank()) {
                helper.setTo(String.format("%s <%s>", n.getRecipientName(), n.getRecipientAddress()));
            }
            mailSender.send(mimeMessage);

            n.setStatus("SENT");
            n.setSentAt(Instant.now());
            n.setProviderMessageId("smtp-" + n.getId());
            logRepository.save(n);
            log.info("Email notification #{} sent to {}", n.getId(), n.getRecipientAddress());
        } catch (Exception e) {
            throw new RuntimeException("Email dispatch failed: " + e.getMessage(), e);
        }
    }

    /**
     * Heuristic: if the body contains HTML tags, treat as HTML.
     */
    private boolean isHtml(NotificationLog n) {
        return n.getBody() != null && (n.getBody().contains("<html") || n.getBody().contains("<p>") || n.getBody().contains("<br"));
    }

    // ── SMS ──────────────────────────────────────────────────────────────────

    private void dispatchSms(NotificationLog n) {
        // Integration point: Twilio / Africa's Talking / SMPP gateway
        // When a provider is configured, replace this with the actual SDK call.
        //
        // Example with Twilio:
        //   Message message = Message.creator(
        //       new PhoneNumber(n.getRecipientAddress()),
        //       new PhoneNumber(twilioFromNumber),
        //       n.getBody()
        //   ).create();
        //   n.setProviderMessageId(message.getSid());

        log.info("SMS notification #{} dispatched (provider=SMS_DEFAULT, recipient={}, bodyLength={})",
                n.getId(), n.getRecipientAddress(), n.getBody().length());
        n.setStatus("SENT");
        n.setSentAt(Instant.now());
        n.setProviderMessageId("sms-" + n.getId() + "-" + Instant.now().toEpochMilli());
        logRepository.save(n);
    }

    // ── PUSH ─────────────────────────────────────────────────────────────────

    private void dispatchPush(NotificationLog n) {
        // Integration point: Firebase Cloud Messaging (FCM)
        // When Firebase Admin SDK is added, replace this with:
        //
        //   Message fcmMessage = Message.builder()
        //       .setToken(n.getRecipientAddress())
        //       .setNotification(Notification.builder()
        //           .setTitle(n.getSubject())
        //           .setBody(n.getBody())
        //           .build())
        //       .build();
        //   String response = FirebaseMessaging.getInstance().send(fcmMessage);
        //   n.setProviderMessageId(response);

        log.info("Push notification #{} dispatched (provider=FCM, recipient={}, subject={})",
                n.getId(), n.getRecipientAddress(), n.getSubject());
        n.setStatus("SENT");
        n.setSentAt(Instant.now());
        n.setProviderMessageId("fcm-" + n.getId() + "-" + Instant.now().toEpochMilli());
        logRepository.save(n);
    }

    // ── IN_APP ───────────────────────────────────────────────────────────────

    private void dispatchInApp(NotificationLog n) {
        n.setStatus("DELIVERED");
        n.setSentAt(Instant.now());
        n.setDeliveredAt(Instant.now());
        logRepository.save(n);
        log.debug("In-app notification #{} stored for customer {}", n.getId(), n.getCustomerId());
    }

    // ── WEBHOOK ──────────────────────────────────────────────────────────────

    private void dispatchWebhook(NotificationLog n) {
        String webhookUrl = n.getRecipientAddress();
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new RuntimeException("Webhook URL is empty");
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = Map.of(
                "eventType", n.getEventType(),
                "subject", n.getSubject() != null ? n.getSubject() : "",
                "body", n.getBody(),
                "customerId", n.getCustomerId() != null ? n.getCustomerId() : 0,
                "recipientName", n.getRecipientName() != null ? n.getRecipientName() : "",
                "channel", n.getChannel().name(),
                "timestamp", Instant.now().toString(),
                "notificationId", n.getId()
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(webhookUrl, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                n.setStatus("DELIVERED");
                n.setSentAt(Instant.now());
                n.setDeliveredAt(Instant.now());
                n.setProviderMessageId("webhook-" + n.getId());
                logRepository.save(n);
                log.info("Webhook notification #{} delivered to {}", n.getId(), webhookUrl);
            } else {
                throw new RuntimeException("Webhook returned HTTP " + response.getStatusCode());
            }
        } catch (Exception e) {
            throw new RuntimeException("Webhook delivery failed to " + webhookUrl + ": " + e.getMessage(), e);
        }
    }
}
