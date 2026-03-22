package com.cbs.channelactivity.dto;

import lombok.*;
import java.time.Instant;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityLogResponse {
    private Long id;
    private String logId;
    private Long customerId;
    private String sessionId;
    private String channel;
    private String activityType;
    private Map<String, Object> activityDetail;
    private String ipAddress;
    private String deviceFingerprint;
    private String geoLocation;
    private Integer responseTimeMs;
    private String resultStatus;
    private String errorCode;
    private Instant createdAt;
}
