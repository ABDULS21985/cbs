package com.cbs.integration;

import com.cbs.notification.entity.NotificationLog;
import com.cbs.notification.repository.NotificationLogRepository;
import com.cbs.notification.repository.NotificationPreferenceRepository;
import com.cbs.notification.repository.NotificationTemplateRepository;
import com.cbs.notification.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class WebhookContractTest {

    @Mock
    private NotificationTemplateRepository templateRepository;
    @Mock
    private NotificationLogRepository logRepository;
    @Mock
    private NotificationPreferenceRepository preferenceRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    @DisplayName("Payment webhook payload matches documented schema")
    void paymentWebhookPayload() {
        Map<String, Object> payload = notificationService.buildWebhookPayload(
                new NotificationService.WebhookEvent(
                        "PAYMENT_COMPLETED",
                        "PAY-123",
                        new BigDecimal("2500.00"),
                        "NGN",
                        "COMPLETED",
                        Instant.parse("2026-03-18T10:15:30Z")
                )
        );

        assertThat(payload).containsKeys("eventType", "paymentRef", "amount", "currency", "status", "timestamp");
        assertThat(payload.get("eventType")).isEqualTo("PAYMENT_COMPLETED");
    }

    @Test
    @DisplayName("Webhook retry policy uses 3 attempts with exponential backoff")
    void webhookRetryPolicy() {
        Instant start = Instant.parse("2026-03-18T10:15:30Z");
        List<Instant> schedule = notificationService.getWebhookRetrySchedule(start);

        assertThat(schedule).hasSize(3);
        assertThat(Duration.between(schedule.get(0), schedule.get(1)).toSeconds()).isEqualTo(30);
        assertThat(Duration.between(schedule.get(0), schedule.get(2)).toSeconds()).isEqualTo(120);
    }

    @Test
    @DisplayName("Webhook is marked FAILED after third failed delivery")
    void webhookMarkedFailedAfterMaxRetries() {
        NotificationLog notification = NotificationLog.builder()
                .eventType("PAYMENT_COMPLETED")
                .recipientAddress("https://partner.example/webhook")
                .body("{\"ok\":true}")
                .retryCount(0)
                .maxRetries(3)
                .status("PENDING")
                .build();

        Instant start = Instant.parse("2026-03-18T10:15:30Z");
        notificationService.registerDeliveryFailure(notification, "connection timeout", start);
        assertThat(notification.getStatus()).isEqualTo("PENDING");
        assertThat(notification.getScheduledAt()).isEqualTo(start.plusSeconds(30));

        notificationService.registerDeliveryFailure(notification, "connection timeout", start);
        assertThat(notification.getStatus()).isEqualTo("PENDING");
        assertThat(notification.getScheduledAt()).isEqualTo(start.plusSeconds(120));

        notificationService.registerDeliveryFailure(notification, "connection timeout", start);
        assertThat(notification.getStatus()).isEqualTo("FAILED");
        assertThat(notification.getScheduledAt()).isNull();
    }
}
