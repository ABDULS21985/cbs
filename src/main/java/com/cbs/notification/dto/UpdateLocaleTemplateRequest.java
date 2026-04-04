package com.cbs.notification.dto;

import com.cbs.notification.entity.NotificationTemplateLocaleStatus;
import com.cbs.notification.entity.TextDirection;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateLocaleTemplateRequest {
    private String locale;
    private String subject;
    private String body;
    private String bodyHtml;
    private TextDirection textDirection;
    private String fontFamily;
    private Boolean isDefault;
    private NotificationTemplateLocaleStatus status;
}
