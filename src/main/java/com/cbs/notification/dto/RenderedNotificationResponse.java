package com.cbs.notification.dto;

import com.cbs.notification.entity.TextDirection;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RenderedNotificationResponse {
    private Long templateId;
    private String locale;
    private String subject;
    private String body;
    private String bodyHtml;
    private TextDirection textDirection;
    private String fontFamily;
}
