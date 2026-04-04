package com.cbs.notification.dto;

import com.cbs.notification.entity.NotificationTemplateLocaleStatus;
import com.cbs.notification.entity.TextDirection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateLocaleTemplateRequest {

    @NotBlank
    private String locale;

    private String subject;

    @NotBlank
    private String body;

    private String bodyHtml;

    @NotNull
    @Builder.Default
    private TextDirection textDirection = TextDirection.AUTO;

    private String fontFamily;

    @Builder.Default
    private Boolean isDefault = false;

    @Builder.Default
    private NotificationTemplateLocaleStatus status = NotificationTemplateLocaleStatus.DRAFT;
}
