package com.cbs.notification;

import com.cbs.audit.service.AuditService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.notification.dto.BilingualNotificationResponse;
import com.cbs.notification.dto.RenderedNotificationResponse;
import com.cbs.notification.entity.*;
import com.cbs.notification.repository.IslamicTerminologyMapRepository;
import com.cbs.notification.repository.NotificationTemplateLocaleRepository;
import com.cbs.notification.repository.NotificationTemplateRepository;
import com.cbs.notification.service.IslamicNotificationService;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IslamicNotificationServiceTest {

    @Mock
    private NotificationTemplateRepository notificationTemplateRepository;

    @Mock
    private NotificationTemplateLocaleRepository notificationTemplateLocaleRepository;

    @Mock
    private IslamicTerminologyMapRepository islamicTerminologyMapRepository;

    @Mock
    private CurrentTenantResolver currentTenantResolver;

    @Mock
    private CurrentActorProvider currentActorProvider;

    @Mock
    private AuditService auditService;

    private IslamicNotificationService service;

    @BeforeEach
    void setUp() {
        service = new IslamicNotificationService(
                notificationTemplateRepository,
                notificationTemplateLocaleRepository,
                islamicTerminologyMapRepository,
                currentTenantResolver,
                currentActorProvider,
                auditService
        );
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(null);
    }

    @Test
    void exactLocaleTakesPrecedenceAndUsesRtlForArabic() {
        NotificationTemplate template = baseTemplate();
        NotificationTemplateLocale locale = NotificationTemplateLocale.builder()
                .id(2L)
                .template(template)
                .locale("ar-SA")
                .subject("تمويل {{customerName}}")
                .body("الفائدة أصبحت {{term}}")
                .textDirection(TextDirection.RTL)
                .fontFamily("Cairo")
                .isDefault(false)
                .status(NotificationTemplateLocaleStatus.ACTIVE)
                .build();

        when(notificationTemplateRepository.findById(1L)).thenReturn(Optional.of(template));
        when(notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdIsNullOrderByIsDefaultDescLocaleAsc(1L))
                .thenReturn(List.of(locale));
        mockTerminology("interest", "profit", "ربح", "GENERAL");

        RenderedNotificationResponse response = service.resolveTemplate(
                1L, "ar-SA", Map.of("customerName", "Amina", "term", "interest"), "GENERAL"
        );

        assertThat(response.getLocale()).isEqualTo("ar-SA");
        assertThat(response.getTextDirection()).isEqualTo(TextDirection.RTL);
        assertThat(response.getBody()).contains("ربح");
    }

    @Test
    void languageFallbackResolvesWhenExactLocaleIsMissing() {
        NotificationTemplate template = baseTemplate();
        NotificationTemplateLocale arabic = NotificationTemplateLocale.builder()
                .id(2L)
                .template(template)
                .locale("ar")
                .subject("تمويل")
                .body("التمويل متاح")
                .textDirection(TextDirection.RTL)
                .status(NotificationTemplateLocaleStatus.ACTIVE)
                .build();
        NotificationTemplateLocale englishDefault = NotificationTemplateLocale.builder()
                .id(3L)
                .template(template)
                .locale("en")
                .subject("Financing")
                .body("Financing available")
                .textDirection(TextDirection.LTR)
                .isDefault(true)
                .status(NotificationTemplateLocaleStatus.ACTIVE)
                .build();

        when(notificationTemplateRepository.findById(1L)).thenReturn(Optional.of(template));
        when(notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdIsNullOrderByIsDefaultDescLocaleAsc(1L))
                .thenReturn(List.of(arabic, englishDefault));
        when(islamicTerminologyMapRepository.findByContextAndStatusAndTenantIdIsNullOrderByConventionalTermAsc(anyString(), any()))
                .thenReturn(List.of());

        RenderedNotificationResponse response = service.resolveTemplate(1L, "ar-QA", Map.of(), "GENERAL");

        assertThat(response.getLocale()).isEqualTo("ar");
        assertThat(response.getBody()).isEqualTo("التمويل متاح");
    }

    @Test
    void terminologyReplacementRunsAfterVariableSubstitution() {
        NotificationTemplate template = baseTemplate();
        when(notificationTemplateRepository.findById(1L)).thenReturn(Optional.of(template));
        when(notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdIsNullOrderByIsDefaultDescLocaleAsc(1L))
                .thenReturn(List.of());
        mockTerminology("interest", "profit", "ربح", "GENERAL");

        RenderedNotificationResponse response = service.resolveTemplate(
                1L, "en", Map.of("customerName", "Musa", "term", "interest"), "GENERAL"
        );

        assertThat(response.getBody()).contains("profit");
        assertThat(response.getBody()).doesNotContain("interest");
    }

    @Test
    void bilingualRenderingProducesEnglishAndArabicVariants() {
        NotificationTemplate template = baseTemplate();
        NotificationTemplateLocale arabic = NotificationTemplateLocale.builder()
                .id(2L)
                .template(template)
                .locale("ar")
                .subject("تمويل")
                .body("التمويل ل{{customerName}}")
                .textDirection(TextDirection.RTL)
                .status(NotificationTemplateLocaleStatus.ACTIVE)
                .build();
        NotificationTemplateLocale english = NotificationTemplateLocale.builder()
                .id(3L)
                .template(template)
                .locale("en")
                .subject("Financing")
                .body("Financing for {{customerName}}")
                .textDirection(TextDirection.LTR)
                .isDefault(true)
                .status(NotificationTemplateLocaleStatus.ACTIVE)
                .build();

        when(notificationTemplateRepository.findById(1L)).thenReturn(Optional.of(template));
        when(notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdIsNullOrderByIsDefaultDescLocaleAsc(1L))
                .thenReturn(List.of(english, arabic));
        when(islamicTerminologyMapRepository.findByContextAndStatusAndTenantIdIsNullOrderByConventionalTermAsc(anyString(), any()))
                .thenReturn(List.of());

        BilingualNotificationResponse response = service.renderBilingual(1L, Map.of("customerName", "Aisha"), "GENERAL");

        assertThat(response.getEnglish().getLocale()).isEqualTo("en");
        assertThat(response.getArabic().getLocale()).isEqualTo("ar");
        assertThat(response.getArabic().getTextDirection()).isEqualTo(TextDirection.RTL);
    }

    private NotificationTemplate baseTemplate() {
        return NotificationTemplate.builder()
                .id(1L)
                .templateCode("TPL-TEST")
                .templateName("Test Template")
                .channel(NotificationChannel.EMAIL)
                .eventType("TEST_EVENT")
                .subject("Financing for {{customerName}}")
                .bodyTemplate("The {{term}} on your loan has changed")
                .locale("en")
                .isActive(true)
                .build();
    }

    private void mockTerminology(String conventionalTerm, String islamicTermEn, String islamicTermAr, String context) {
        IslamicTerminologyMap mapping = IslamicTerminologyMap.builder()
                .id(1L)
                .conventionalTerm(conventionalTerm)
                .islamicTermEn(islamicTermEn)
                .islamicTermAr(islamicTermAr)
                .context(context)
                .status(TerminologyStatus.ACTIVE)
                .build();
        when(islamicTerminologyMapRepository.findByContextAndStatusAndTenantIdIsNullOrderByConventionalTermAsc(eq(context), eq(TerminologyStatus.ACTIVE)))
                .thenReturn(List.of(mapping));
        when(islamicTerminologyMapRepository.findByContextAndStatusAndTenantIdIsNullOrderByConventionalTermAsc(eq("GENERAL"), eq(TerminologyStatus.ACTIVE)))
                .thenReturn(List.of(mapping));
        when(islamicTerminologyMapRepository.findByStatusAndTenantIdIsNullOrderByContextAscConventionalTermAsc(TerminologyStatus.ACTIVE))
                .thenReturn(List.of(mapping));
    }
}
