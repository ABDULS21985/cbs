package com.cbs.notification;

import com.cbs.AbstractIntegrationTest;
import com.cbs.notification.dto.CreateLocaleTemplateRequest;
import com.cbs.notification.dto.RenderedNotificationResponse;
import com.cbs.notification.entity.NotificationTemplate;
import com.cbs.notification.entity.NotificationTemplateLocaleStatus;
import com.cbs.notification.entity.TextDirection;
import com.cbs.notification.repository.NotificationTemplateRepository;
import com.cbs.notification.service.IslamicNotificationService;
import com.cbs.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class IslamicNotificationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private IslamicNotificationService islamicNotificationService;

    @Autowired
    private NotificationTemplateRepository notificationTemplateRepository;

    @Autowired
    private NotificationService notificationService;

    @Test
    void createLocaleTemplateAndRenderWithVariables() {
        NotificationTemplate template = notificationTemplateRepository.findByTemplateCode("TPL-WELCOME-EMAIL").orElseThrow();

        islamicNotificationService.addLocaleTemplate(template.getId(), CreateLocaleTemplateRequest.builder()
                .locale("ar")
                .subject("تمويل {{customerName}}")
                .body("تم تحديث الفائدة إلى {{term}}")
                .textDirection(TextDirection.RTL)
                .fontFamily("Cairo")
                .isDefault(false)
                .status(NotificationTemplateLocaleStatus.ACTIVE)
                .build());

        RenderedNotificationResponse rendered = islamicNotificationService.resolveTemplate(
                template.getId(),
                "ar",
                Map.of("customerName", "Amina", "term", "interest"),
                "GENERAL"
        );

        assertThat(rendered.getBody()).contains("ربح");
        assertThat(rendered.getTextDirection()).isEqualTo(TextDirection.RTL);
    }

    @Test
    void missingLocaleFallsBackToOriginalTemplate() {
        NotificationTemplate template = notificationTemplateRepository.findByTemplateCode("TPL-STMT-EMAIL").orElseThrow();

        RenderedNotificationResponse rendered = islamicNotificationService.resolveTemplate(
                template.getId(),
                "fr-FR",
                Map.of("customerName", "Kareem", "period", "monthly", "accountNumber", "12345"),
                "GENERAL"
        );

        assertThat(rendered.getLocale()).isEqualTo("fr-FR");
        assertThat(rendered.getBody()).contains("12345");
    }

    @Test
    void terminologyDictionaryReturnsActiveMappings() {
        assertThat(islamicNotificationService.getTerminologyDictionary())
                .containsKey("interest")
                .containsKey("loan");
    }

    @Test
    void existingNotificationSendingStillWorks() {
        var notification = notificationService.sendDirect(
                com.cbs.notification.entity.NotificationChannel.EMAIL,
                "test@example.com",
                "Test User",
                "Test Subject",
                "Test Body",
                null,
                "DIRECT_TEST"
        );

        assertThat(notification.getId()).isNotNull();
        assertThat(notification.getStatus()).isIn("PENDING_DISPATCH", "DELIVERED");
    }
}
