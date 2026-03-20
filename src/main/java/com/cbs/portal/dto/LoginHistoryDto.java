package com.cbs.portal.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginHistoryDto {
    private Long id;
    private String timestamp;
    private String ipAddress;
    private String device;
    private String location;
    private String status;
}
