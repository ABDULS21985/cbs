package com.cbs.notification.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BilingualNotificationResponse {
    private RenderedNotificationResponse english;
    private RenderedNotificationResponse arabic;
}
