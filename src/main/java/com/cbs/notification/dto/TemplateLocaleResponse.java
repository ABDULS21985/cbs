package com.cbs.notification.dto;

import com.cbs.notification.entity.NotificationTemplateLocaleStatus;
import com.cbs.notification.entity.TextDirection;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateLocaleResponse {
    private Long id;
    private Long templateId;
    private String locale;
    private String subject;
    private String body;
    private String bodyHtml;
    private TextDirection textDirection;
    private String fontFamily;
    private Boolean isDefault;
    private NotificationTemplateLocaleStatus status;
    private String reviewedBy;
    private Instant reviewedAt;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
}
