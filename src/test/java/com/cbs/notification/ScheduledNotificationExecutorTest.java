package com.cbs.notification;

import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.notification.entity.*;
import com.cbs.notification.repository.ChannelConfigRepository;
import com.cbs.notification.repository.NotificationTemplateRepository;
import com.cbs.notification.repository.ScheduledNotificationRepository;
import com.cbs.notification.service.NotificationService;
import com.cbs.notification.service.ScheduledNotificationExecutor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScheduledNotificationExecutor")
class ScheduledNotificationExecutorTest {

    @Mock private ScheduledNotificationRepository scheduledRepo;
    @Mock private NotificationTemplateRepository templateRepo;
    @Mock private ChannelConfigRepository channelConfigRepo;
    @Mock private CustomerRepository customerRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private ScheduledNotificationExecutor executor;

    private ScheduledNotification buildCampaign(String frequency, String status, Instant nextRun) {
        ScheduledNotification sn = new ScheduledNotification();
        sn.setId(1L);
        sn.setName("Test Campaign");
        sn.setChannel(NotificationChannel.EMAIL);
        sn.setSubject("Campaign Subject");
        sn.setBody("Hello {{customerName}}, this is a campaign.");
        sn.setFrequency(frequency);
        sn.setStatus(status);
        sn.setNextRun(nextRun);
        sn.setCreatedAt(Instant.now().minus(7, ChronoUnit.DAYS));
        sn.setUpdatedAt(Instant.now());
        return sn;
    }

    private Customer buildCustomer(Long id, String firstName, String lastName, String email) {
        Customer c = new Customer();
        c.setId(id);
        c.setFirstName(firstName);
        c.setLastName(lastName);
        c.setEmail(email);
        c.setStatus(CustomerStatus.ACTIVE);
        return c;
    }

    // =================================================================
    // NO DUE CAMPAIGNS
    // =================================================================

    @Nested
    @DisplayName("No Due Campaigns")
    class NoDueCampaigns {

        @Test
        @DisplayName("does nothing when no campaigns are due")
        void noDueCampaigns_noAction() {
            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of());

            executor.executeDueCampaigns();

            verify(notificationService, never()).sendDirect(any(), any(), any(), any(), any(), any(), any());
        }
    }

    // =================================================================
    // ONCE FREQUENCY
    // =================================================================

    @Nested
    @DisplayName("ONCE Frequency")
    class OnceFrequency {

        @Test
        @DisplayName("executes campaign and marks COMPLETED for ONCE frequency")
        void onceCampaign_marksCompleted() {
            ScheduledNotification campaign = buildCampaign("ONCE", "ACTIVE",
                    Instant.now().minus(1, ChronoUnit.MINUTES));
            campaign.setRecipientCriteria(Map.of("broadcast", true));

            Customer c1 = buildCustomer(1L, "John", "Doe", "john@example.com");
            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(campaign));
            when(channelConfigRepo.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.of(ChannelConfig.builder().channel(NotificationChannel.EMAIL).enabled(true).build()));
            when(customerRepository.findByStatus(eq(CustomerStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(c1)));
            when(notificationService.sendDirect(any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(new NotificationLog());

            executor.executeDueCampaigns();

            verify(notificationService).sendDirect(
                    eq(NotificationChannel.EMAIL),
                    eq("john@example.com"),
                    eq("John Doe"),
                    any(), // subject
                    any(), // body
                    eq(1L),
                    any() // eventType
            );
            assertThat(campaign.getStatus()).isEqualTo("COMPLETED");
            assertThat(campaign.getLastRun()).isNotNull();
            assertThat(campaign.getRecipientCount()).isEqualTo(1);
            verify(scheduledRepo).save(campaign);
        }
    }

    // =================================================================
    // DAILY FREQUENCY
    // =================================================================

    @Nested
    @DisplayName("DAILY Frequency")
    class DailyFrequency {

        @Test
        @DisplayName("advances nextRun by 1 day for DAILY frequency")
        void dailyCampaign_advancesNextRun() {
            Instant originalNextRun = Instant.now().minus(1, ChronoUnit.MINUTES);
            ScheduledNotification campaign = buildCampaign("DAILY", "ACTIVE", originalNextRun);
            campaign.setRecipientCriteria(Map.of("broadcast", true));

            Customer c1 = buildCustomer(1L, "Jane", "Smith", "jane@example.com");
            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(campaign));
            when(channelConfigRepo.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.of(ChannelConfig.builder().channel(NotificationChannel.EMAIL).enabled(true).build()));
            when(customerRepository.findByStatus(eq(CustomerStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(c1)));
            when(notificationService.sendDirect(any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(new NotificationLog());

            executor.executeDueCampaigns();

            assertThat(campaign.getStatus()).isEqualTo("ACTIVE");
            assertThat(campaign.getNextRun()).isEqualTo(originalNextRun.plus(1, ChronoUnit.DAYS));
            verify(scheduledRepo).save(campaign);
        }
    }

    // =================================================================
    // WEEKLY FREQUENCY
    // =================================================================

    @Nested
    @DisplayName("WEEKLY Frequency")
    class WeeklyFrequency {

        @Test
        @DisplayName("advances nextRun by 7 days for WEEKLY frequency")
        void weeklyCampaign_advancesNextRunBy7Days() {
            Instant originalNextRun = Instant.now().minus(1, ChronoUnit.MINUTES);
            ScheduledNotification campaign = buildCampaign("WEEKLY", "ACTIVE", originalNextRun);
            campaign.setRecipientCriteria(Map.of("broadcast", true));

            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(campaign));
            when(channelConfigRepo.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.of(ChannelConfig.builder().channel(NotificationChannel.EMAIL).enabled(true).build()));
            when(customerRepository.findByStatus(eq(CustomerStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of()));

            executor.executeDueCampaigns();

            assertThat(campaign.getNextRun()).isEqualTo(originalNextRun.plus(7, ChronoUnit.DAYS));
        }
    }

    // =================================================================
    // DISABLED CHANNEL
    // =================================================================

    @Nested
    @DisplayName("Disabled Channel")
    class DisabledChannel {

        @Test
        @DisplayName("skips campaign when channel is disabled in config")
        void disabledChannel_skipsCampaign() {
            ScheduledNotification campaign = buildCampaign("DAILY", "ACTIVE",
                    Instant.now().minus(1, ChronoUnit.MINUTES));

            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(campaign));
            when(channelConfigRepo.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.of(ChannelConfig.builder().channel(NotificationChannel.EMAIL).enabled(false).build()));

            executor.executeDueCampaigns();

            verify(notificationService, never()).sendDirect(any(), any(), any(), any(), any(), any(), any());
            // Campaign state should not change (still ACTIVE, no save with COMPLETED)
        }
    }

    // =================================================================
    // TEMPLATE RESOLUTION
    // =================================================================

    @Nested
    @DisplayName("Template Resolution")
    class TemplateResolution {

        @Test
        @DisplayName("resolves body and subject from template when templateCode is set")
        void templateCode_resolvesFromTemplate() {
            ScheduledNotification campaign = buildCampaign("ONCE", "ACTIVE",
                    Instant.now().minus(1, ChronoUnit.MINUTES));
            campaign.setTemplateCode("PROMO_EMAIL");
            campaign.setRecipientCriteria(Map.of("broadcast", true));

            NotificationTemplate template = new NotificationTemplate();
            template.setTemplateCode("PROMO_EMAIL");
            template.setSubject("Special Offer for {{customerName}}");
            template.setBodyTemplate("Dear {{customerName}}, check out our deals!");
            template.setEventType("MARKETING");

            Customer c1 = buildCustomer(1L, "Ada", "Obi", "ada@example.com");

            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(campaign));
            when(channelConfigRepo.findByChannel(NotificationChannel.EMAIL))
                    .thenReturn(Optional.empty());
            when(templateRepo.findByTemplateCode("PROMO_EMAIL"))
                    .thenReturn(Optional.of(template));
            when(customerRepository.findByStatus(eq(CustomerStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(c1)));
            when(notificationService.sendDirect(any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(new NotificationLog());

            executor.executeDueCampaigns();

            verify(notificationService).sendDirect(
                    eq(NotificationChannel.EMAIL),
                    eq("ada@example.com"),
                    eq("Ada Obi"),
                    contains("Ada Obi"), // subject should have merge field resolved
                    contains("Ada Obi"), // body should have merge field resolved
                    eq(1L),
                    eq("MARKETING")
            );
        }
    }

    // =================================================================
    // RECIPIENT CRITERIA
    // =================================================================

    @Nested
    @DisplayName("Recipient Criteria")
    class RecipientCriteria {

        @Test
        @DisplayName("sends to multiple broadcast recipients")
        void broadcastCriteria_sendsToAllActive() {
            ScheduledNotification campaign = buildCampaign("ONCE", "ACTIVE",
                    Instant.now().minus(1, ChronoUnit.MINUTES));
            campaign.setRecipientCriteria(Map.of("broadcast", true));

            Customer c1 = buildCustomer(1L, "User", "One", "one@example.com");
            Customer c2 = buildCustomer(2L, "User", "Two", "two@example.com");

            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(campaign));
            when(channelConfigRepo.findByChannel(any())).thenReturn(Optional.empty());
            when(customerRepository.findByStatus(eq(CustomerStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(c1, c2)));
            when(notificationService.sendDirect(any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(new NotificationLog());

            executor.executeDueCampaigns();

            verify(notificationService, times(2)).sendDirect(any(), any(), any(), any(), any(), any(), any());
            assertThat(campaign.getRecipientCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("sends to explicit recipient list from criteria JSON")
        void explicitRecipients_sendsToList() {
            ScheduledNotification campaign = buildCampaign("ONCE", "ACTIVE",
                    Instant.now().minus(1, ChronoUnit.MINUTES));
            campaign.setRecipientCriteria(Map.of(
                    "recipients", List.of(
                            Map.of("address", "vip1@example.com", "name", "VIP One", "customerId", 10),
                            Map.of("address", "vip2@example.com", "name", "VIP Two", "customerId", 20)
                    )
            ));

            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(campaign));
            when(channelConfigRepo.findByChannel(any())).thenReturn(Optional.empty());
            when(notificationService.sendDirect(any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(new NotificationLog());

            executor.executeDueCampaigns();

            verify(notificationService, times(2)).sendDirect(any(), any(), any(), any(), any(), any(), any());
            assertThat(campaign.getRecipientCount()).isEqualTo(2);
        }
    }

    // =================================================================
    // ERROR RESILIENCE
    // =================================================================

    @Nested
    @DisplayName("Error Resilience")
    class ErrorResilience {

        @Test
        @DisplayName("continues execution even when one campaign fails")
        void oneCampaignFails_othersContinue() {
            ScheduledNotification bad = buildCampaign("ONCE", "ACTIVE",
                    Instant.now().minus(1, ChronoUnit.MINUTES));
            bad.setId(1L);
            bad.setRecipientCriteria(Map.of("broadcast", true));

            ScheduledNotification good = buildCampaign("ONCE", "ACTIVE",
                    Instant.now().minus(1, ChronoUnit.MINUTES));
            good.setId(2L);
            good.setRecipientCriteria(Map.of("broadcast", true));

            when(scheduledRepo.findDueForExecution(any(Instant.class))).thenReturn(List.of(bad, good));
            when(channelConfigRepo.findByChannel(any())).thenReturn(Optional.empty());
            // First call to findByStatus throws; second succeeds
            when(customerRepository.findByStatus(eq(CustomerStatus.ACTIVE), any(Pageable.class)))
                    .thenThrow(new RuntimeException("DB error"))
                    .thenReturn(new PageImpl<>(List.of()));

            executor.executeDueCampaigns();

            // Despite first campaign error, the second should still execute
            verify(scheduledRepo).save(good);
        }
    }
}
