package com.cbs.notification;

import com.cbs.notification.entity.*;
import com.cbs.notification.repository.*;
import com.cbs.notification.service.NotificationDispatcher;
import com.cbs.notification.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService")
class NotificationServiceTest {

    @Mock private NotificationLogRepository logRepository;
    @Mock private NotificationTemplateRepository templateRepository;
    @Mock private NotificationPreferenceRepository preferenceRepository;
    @Mock private ScheduledNotificationRepository scheduledRepository;
    @Mock private NotificationTemplateVersionRepository versionRepository;
    @Mock private NotificationDispatcher dispatcher;

    @InjectMocks private NotificationService service;

    // =================================================================
    // DIRECT SEND
    // =================================================================

    @Nested
    @DisplayName("Direct Send")
    class DirectSendTests {

        @Test
        @DisplayName("sendDirect creates log and dispatches")
        void sendDirect_createsAndDispatches() {
            when(logRepository.save(any())).thenAnswer(inv -> {
                NotificationLog log = inv.getArgument(0);
                log.setId(1L);
                return log;
            });

            NotificationLog result = service.sendDirect(
                    NotificationChannel.EMAIL, "test@example.com", "Test User",
                    "Hello", "Test body", 123L, "DIRECT");

            assertThat(result).isNotNull();
            assertThat(result.getChannel()).isEqualTo(NotificationChannel.EMAIL);
            assertThat(result.getRecipientAddress()).isEqualTo("test@example.com");
            assertThat(result.getSubject()).isEqualTo("Hello");
            assertThat(result.getStatus()).isEqualTo("PENDING_DISPATCH");
            verify(logRepository).save(any(NotificationLog.class));
            verify(dispatcher).dispatch(any(NotificationLog.class));
        }

        @Test
        @DisplayName("sendDirect handles null customerId")
        void sendDirect_nullCustomer() {
            when(logRepository.save(any())).thenAnswer(inv -> {
                NotificationLog log = inv.getArgument(0);
                log.setId(2L);
                return log;
            });

            NotificationLog result = service.sendDirect(
                    NotificationChannel.SMS, "+2348001234567", "User",
                    null, "OTP: 1234", null, "OTP");

            assertThat(result.getCustomerId()).isNull();
            assertThat(result.getChannel()).isEqualTo(NotificationChannel.SMS);
        }
    }

    // =================================================================
    // TEMPLATE MANAGEMENT
    // =================================================================

    @Nested
    @DisplayName("Template Management")
    class TemplateTests {

        @Test
        @DisplayName("createTemplate persists and returns template")
        void createTemplate() {
            NotificationTemplate template = new NotificationTemplate();
            template.setTemplateCode("ACC_OPEN");
            template.setTemplateName("Account Opening");
            template.setChannel(NotificationChannel.EMAIL);
            template.setEventType("ACCOUNT_OPENED");
            template.setBodyTemplate("Dear {{customerName}}, your account {{accountNumber}} is now open.");

            when(templateRepository.save(any())).thenAnswer(inv -> {
                NotificationTemplate t = inv.getArgument(0);
                t.setId(1L);
                return t;
            });

            NotificationTemplate result = service.createTemplate(template);

            assertThat(result.getId()).isNotNull();
            assertThat(result.getTemplateCode()).isEqualTo("ACC_OPEN");
            assertThat(result.getIsActive()).isTrue();
            verify(templateRepository).save(template);
        }

        @Test
        @DisplayName("updateTemplateWithVersion creates version history entry")
        void updateTemplate_createsVersion() {
            NotificationTemplate existing = new NotificationTemplate();
            existing.setId(1L);
            existing.setTemplateCode("ACC_OPEN");
            existing.setBodyTemplate("Old body");
            existing.setSubject("Old subject");

            NotificationTemplate incoming = new NotificationTemplate();
            incoming.setBodyTemplate("New body");
            incoming.setSubject("New subject");
            incoming.setTemplateName("Updated Name");

            when(templateRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(templateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(versionRepository.findMaxVersionNumber(1L)).thenReturn(Optional.of(2));
            when(versionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            NotificationTemplate result = service.updateTemplateWithVersion(1L, incoming, "admin");

            assertThat(result.getBodyTemplate()).isEqualTo("New body");
            assertThat(result.getSubject()).isEqualTo("New subject");
            verify(versionRepository).save(any(NotificationTemplateVersion.class));
        }
    }

    // =================================================================
    // PREFERENCES
    // =================================================================

    @Nested
    @DisplayName("Notification Preferences")
    class PreferenceTests {

        @Test
        @DisplayName("updatePreference creates new preference when none exists")
        void updatePreference_createsNew() {
            when(preferenceRepository.findByCustomerIdAndChannelAndEventType(1L, NotificationChannel.EMAIL, "ACCOUNT_ALERT"))
                    .thenReturn(Optional.empty());
            when(preferenceRepository.save(any())).thenAnswer(inv -> {
                NotificationPreference p = inv.getArgument(0);
                p.setId(1L);
                return p;
            });

            NotificationPreference result = service.updatePreference(1L, NotificationChannel.EMAIL, "ACCOUNT_ALERT", false);

            assertThat(result.getIsEnabled()).isFalse();
            assertThat(result.getCustomerId()).isEqualTo(1L);
            assertThat(result.getChannel()).isEqualTo(NotificationChannel.EMAIL);
        }

        @Test
        @DisplayName("updatePreference updates existing preference")
        void updatePreference_updatesExisting() {
            NotificationPreference existing = new NotificationPreference();
            existing.setId(1L);
            existing.setCustomerId(1L);
            existing.setChannel(NotificationChannel.SMS);
            existing.setEventType("MARKETING");
            existing.setIsEnabled(true);

            when(preferenceRepository.findByCustomerIdAndChannelAndEventType(1L, NotificationChannel.SMS, "MARKETING"))
                    .thenReturn(Optional.of(existing));
            when(preferenceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            NotificationPreference result = service.updatePreference(1L, NotificationChannel.SMS, "MARKETING", false);

            assertThat(result.getIsEnabled()).isFalse();
            assertThat(result.getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("getPreferences returns all preferences for customer")
        void getPreferences() {
            NotificationPreference p1 = new NotificationPreference();
            p1.setCustomerId(1L);
            p1.setChannel(NotificationChannel.EMAIL);
            p1.setEventType("ACCOUNT_ALERT");
            p1.setIsEnabled(true);

            when(preferenceRepository.findByCustomerId(1L)).thenReturn(List.of(p1));

            List<NotificationPreference> result = service.getPreferences(1L);
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getChannel()).isEqualTo(NotificationChannel.EMAIL);
        }
    }

    // =================================================================
    // RETRY LOGIC
    // =================================================================

    @Nested
    @DisplayName("Retry Logic")
    class RetryTests {

        @Test
        @DisplayName("retryFailedNotifications dispatches pending retry candidates")
        void retryFailed() {
            NotificationLog pending1 = new NotificationLog();
            pending1.setId(1L);
            pending1.setStatus("PENDING");
            pending1.setRetryCount(1);
            pending1.setMaxRetries(3);

            NotificationLog pending2 = new NotificationLog();
            pending2.setId(2L);
            pending2.setStatus("PENDING");
            pending2.setRetryCount(0);
            pending2.setMaxRetries(3);

            when(logRepository.findPendingForRetry()).thenReturn(List.of(pending1, pending2));

            int count = service.retryFailedNotifications();

            assertThat(count).isEqualTo(2);
            verify(dispatcher, times(2)).dispatch(any(NotificationLog.class));
        }
    }

    // =================================================================
    // SCHEDULED NOTIFICATIONS
    // =================================================================

    @Nested
    @DisplayName("Scheduled Notifications")
    class ScheduledTests {

        @Test
        @DisplayName("toggleScheduledNotification switches ACTIVE to PAUSED")
        void toggle_activeToPaused() {
            ScheduledNotification sn = new ScheduledNotification();
            sn.setId(1L);
            sn.setStatus("ACTIVE");

            when(scheduledRepository.findById(1L)).thenReturn(Optional.of(sn));
            when(scheduledRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ScheduledNotification result = service.toggleScheduledNotification(1L);

            assertThat(result.getStatus()).isEqualTo("PAUSED");
        }

        @Test
        @DisplayName("toggleScheduledNotification switches PAUSED to ACTIVE")
        void toggle_pausedToActive() {
            ScheduledNotification sn = new ScheduledNotification();
            sn.setId(2L);
            sn.setStatus("PAUSED");

            when(scheduledRepository.findById(2L)).thenReturn(Optional.of(sn));
            when(scheduledRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ScheduledNotification result = service.toggleScheduledNotification(2L);

            assertThat(result.getStatus()).isEqualTo("ACTIVE");
        }

        @Test
        @DisplayName("deleteScheduledNotification removes campaign by ID")
        void delete() {
            service.deleteScheduledNotification(3L);

            verify(scheduledRepository).deleteById(3L);
        }
    }

    // =================================================================
    // CUSTOMER NOTIFICATIONS
    // =================================================================

    @Nested
    @DisplayName("Customer Notifications")
    class CustomerNotificationTests {

        @Test
        @DisplayName("getCustomerNotifications returns paginated results")
        void getCustomerNotifications() {
            NotificationLog log1 = new NotificationLog();
            log1.setId(1L);
            log1.setCustomerId(42L);
            log1.setChannel(NotificationChannel.IN_APP);

            Page<NotificationLog> page = new PageImpl<>(List.of(log1));
            when(logRepository.findByCustomerIdOrderByCreatedAtDesc(42L, PageRequest.of(0, 20)))
                    .thenReturn(page);

            Page<NotificationLog> result = service.getCustomerNotifications(42L, PageRequest.of(0, 20));

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getCustomerId()).isEqualTo(42L);
        }
    }
}
