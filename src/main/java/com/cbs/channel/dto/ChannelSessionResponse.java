package com.cbs.channel.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelSessionResponse {
    private Long id;
    private String sessionId;
    private Long customerId;
    private String channel;
    private String deviceId;
    private String deviceType;
    private String ipAddress;
    private String userAgent;
    private BigDecimal geoLatitude;
    private BigDecimal geoLongitude;
    private Instant startedAt;
    private Instant lastActivityAt;
    private Instant endedAt;
    private Integer timeoutSeconds;
    private String parentSessionId;
    private String handoffFromChannel;
    private Map<String, Object> contextData;
    private String status;
    private Instant createdAt;
}
