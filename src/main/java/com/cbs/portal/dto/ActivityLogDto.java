package com.cbs.portal.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLogDto {
    private Long id;
    private String eventType;
    private String action;
    private String description;
    private String performedAt;
    private String ipAddress;
    private String channel;
}
