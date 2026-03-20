package com.cbs.portal.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActiveSessionDto {
    private String sessionId;
    private String device;
    private String ipAddress;
    private String location;
    private String loginTime;
    private String lastActive;
    private boolean current;
}
