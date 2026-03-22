package com.cbs.channelactivity.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LogActivityRequest {

    private Long customerId;

    @Size(max = 80, message = "Session ID must not exceed 80 characters")
    private String sessionId;

    @NotBlank(message = "Channel is required")
    @Size(max = 20, message = "Channel must not exceed 20 characters")
    private String channel;

    @NotBlank(message = "Activity type is required")
    @Size(max = 30, message = "Activity type must not exceed 30 characters")
    private String activityType;

    private Map<String, Object> activityDetail;

    @Size(max = 45, message = "IP address must not exceed 45 characters")
    private String ipAddress;

    @Size(max = 200, message = "Device fingerprint must not exceed 200 characters")
    private String deviceFingerprint;

    @Size(max = 100, message = "Geo location must not exceed 100 characters")
    private String geoLocation;

    @Min(value = 0, message = "Response time must be non-negative")
    private Integer responseTimeMs;

    @NotBlank(message = "Result status is required")
    @Size(max = 15, message = "Result status must not exceed 15 characters")
    private String resultStatus;

    @Size(max = 30, message = "Error code must not exceed 30 characters")
    private String errorCode;
}
