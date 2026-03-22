package com.cbs.notification;

import com.cbs.notification.entity.ChannelConfig;
import com.cbs.notification.entity.NotificationChannel;
import com.cbs.notification.entity.NotificationLog;
import com.cbs.notification.repository.ChannelConfigRepository;
import com.cbs.notification.repository.NotificationLogRepository;
import com.cbs.notification.service.NotificationDispatcher;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationDispatcher")
class NotificationDispatcherTest {

    @Mock private NotificationLogRepository logRepository;
    @Mock private ChannelConfigRepository channelConfigRepository;

    @InjectMocks private NotificationDispatcher dispatcher;

    private NotificationLog buildLog(NotificationChannel channel) {
        return NotificationLog.builder()
                .id(1L)
                .channel(channel)
                .eventType("TEST")
                .recipientAddress(channel == NotificationChannel.EMAIL ? "test@example.com"
                        : channel == NotificationChannel.SMS ? "+2348001234567"
                        : channel == NotificationChannel.WEBHOOK ? "https://hooks.example.com/notify"
                        : "device-token-123")
                .recipientName("Test User")
                .subject("Test Notification")
                .body("This is a test notification body.")
                .status("PENDING_DISPATCH")
                .customerId(42L)
                .build();
    }

    private ChannelConfig buildConfig(NotificationChannel channel, boolean enabled) {
        return ChannelConfig.builder()
                .id(1L)
                .channel(channel)
                .provider(channel == NotificationChannel.EMAIL ? "SMTP"
                        : channel == NotificationChannel.SMS ? "TWILIO"
                        : channel == NotificationChannel.PUSH ? "FIREBASE"
                        : "HTTP_CLIENT")
                .enabled(enabled)
                .senderAddress("noreply@digicore.bank")
                .rateLimit(100)
                .retryEnabled(true)
                .maxRetries(3)
                .build();
    }

    // =================================================================
    // CHANNEL DISABLED
    // =================================================================

    @Nested
    @DisplayName("Disabled Channel")
    class DisabledChannelTests {

        @Test
        @DisplayName("marks notification FAILED when channel is disabled in config")
        void dispatch_disabledChannel_marksFailed() {
            NotificationLog log = buildLog(NotificationChannel.EMAIL);
            ChannelConfig disabledCfg = buildConfig(NotificationChannel.EMAIL, false);
            when(channelConfigRepository.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.of(disabledCfg));

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("FAILED");
            assertThat(log.getFailureReason()).contains("disabled");
            verify(logRepository).save(log);
        }
    }

    // =================================================================
    // EMAIL CHANNEL
    // =================================================================

    @Nested
    @DisplayName("Email Channel")
    class EmailTests {

        @Test
        @DisplayName("simulates delivery when JavaMailSender is not configured")
        void dispatch_email_noMailSender_simulatesDelivery() {
            NotificationLog log = buildLog(NotificationChannel.EMAIL);
            when(channelConfigRepository.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.of(buildConfig(NotificationChannel.EMAIL, true)));

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("DELIVERED");
            assertThat(log.getSentAt()).isNotNull();
            assertThat(log.getDeliveredAt()).isNotNull();
            assertThat(log.getProvider()).isEqualTo("SMTP_SIMULATED");
            assertThat(log.getProviderMessageId()).startsWith("smtp-sim-");
            verify(logRepository).save(log);
        }

        @Test
        @DisplayName("simulates delivery even when no channel config exists")
        void dispatch_email_noConfig_simulatesDelivery() {
            NotificationLog log = buildLog(NotificationChannel.EMAIL);
            when(channelConfigRepository.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.empty());

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("DELIVERED");
            assertThat(log.getProviderMessageId()).startsWith("smtp-sim-");
            verify(logRepository).save(log);
        }
    }

    // =================================================================
    // SMS CHANNEL
    // =================================================================

    @Nested
    @DisplayName("SMS Channel")
    class SmsTests {

        @Test
        @DisplayName("dispatches SMS with simulated delivery and provider info")
        void dispatch_sms_simulatesDelivery() {
            NotificationLog log = buildLog(NotificationChannel.SMS);
            when(channelConfigRepository.findByChannel(NotificationChannel.SMS))
                    .thenReturn(Optional.of(buildConfig(NotificationChannel.SMS, true)));

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("DELIVERED");
            assertThat(log.getSentAt()).isNotNull();
            assertThat(log.getDeliveredAt()).isNotNull();
            assertThat(log.getProvider()).isEqualTo("TWILIO");
            assertThat(log.getProviderMessageId()).startsWith("sms-");
            verify(logRepository).save(log);
        }

        @Test
        @DisplayName("uses default provider when no channel config exists")
        void dispatch_sms_noConfig_usesDefault() {
            NotificationLog log = buildLog(NotificationChannel.SMS);
            when(channelConfigRepository.findByChannel(NotificationChannel.SMS))
                    .thenReturn(Optional.empty());

            dispatcher.dispatch(log);

            assertThat(log.getProvider()).isEqualTo("SMS_DEFAULT");
            assertThat(log.getStatus()).isEqualTo("DELIVERED");
            verify(logRepository).save(log);
        }
    }

    // =================================================================
    // PUSH CHANNEL
    // =================================================================

    @Nested
    @DisplayName("Push Channel")
    class PushTests {

        @Test
        @DisplayName("dispatches push notification with simulated delivery")
        void dispatch_push_simulatesDelivery() {
            NotificationLog log = buildLog(NotificationChannel.PUSH);
            when(channelConfigRepository.findByChannel(NotificationChannel.PUSH))
                    .thenReturn(Optional.of(buildConfig(NotificationChannel.PUSH, true)));

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("DELIVERED");
            assertThat(log.getSentAt()).isNotNull();
            assertThat(log.getDeliveredAt()).isNotNull();
            assertThat(log.getProvider()).isEqualTo("FIREBASE");
            assertThat(log.getProviderMessageId()).startsWith("fcm-");
            verify(logRepository).save(log);
        }
    }

    // =================================================================
    // IN_APP CHANNEL
    // =================================================================

    @Nested
    @DisplayName("In-App Channel")
    class InAppTests {

        @Test
        @DisplayName("marks in-app notification as DELIVERED immediately")
        void dispatch_inApp_deliveredImmediately() {
            NotificationLog log = buildLog(NotificationChannel.IN_APP);
            when(channelConfigRepository.findByChannel(NotificationChannel.IN_APP))
                    .thenReturn(Optional.empty());

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("DELIVERED");
            assertThat(log.getSentAt()).isNotNull();
            assertThat(log.getDeliveredAt()).isNotNull();
            verify(logRepository).save(log);
        }
    }

    // =================================================================
    // WEBHOOK CHANNEL
    // =================================================================

    @Nested
    @DisplayName("Webhook Channel")
    class WebhookTests {

        @Test
        @DisplayName("fails when webhook URL is empty")
        void dispatch_webhook_emptyUrl_fails() {
            NotificationLog log = buildLog(NotificationChannel.WEBHOOK);
            log.setRecipientAddress(""); // empty URL
            when(channelConfigRepository.findByChannel(NotificationChannel.WEBHOOK))
                    .thenReturn(Optional.empty());

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("FAILED");
            assertThat(log.getFailureReason()).contains("Webhook URL is empty");
            verify(logRepository).save(log);
        }

        @Test
        @DisplayName("fails when webhook URL is unreachable")
        void dispatch_webhook_unreachableUrl_fails() {
            NotificationLog log = buildLog(NotificationChannel.WEBHOOK);
            log.setRecipientAddress("http://localhost:1/unreachable");
            when(channelConfigRepository.findByChannel(NotificationChannel.WEBHOOK))
                    .thenReturn(Optional.of(buildConfig(NotificationChannel.WEBHOOK, true)));

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("FAILED");
            assertThat(log.getFailureReason()).isNotNull();
            verify(logRepository).save(log);
        }
    }

    // =================================================================
    // ERROR HANDLING
    // =================================================================

    @Nested
    @DisplayName("Error Handling")
    class ErrorHandlingTests {

        @Test
        @DisplayName("truncates failure reason to 500 characters max")
        void dispatch_longError_truncated() {
            NotificationLog log = buildLog(NotificationChannel.WEBHOOK);
            log.setRecipientAddress("http://localhost:1/will-fail");
            when(channelConfigRepository.findByChannel(NotificationChannel.WEBHOOK))
                    .thenReturn(Optional.empty());

            dispatcher.dispatch(log);

            assertThat(log.getStatus()).isEqualTo("FAILED");
            assertThat(log.getFailureReason()).isNotNull();
            assertThat(log.getFailureReason().length()).isLessThanOrEqualTo(500);
            verify(logRepository).save(log);
        }
    }
}
