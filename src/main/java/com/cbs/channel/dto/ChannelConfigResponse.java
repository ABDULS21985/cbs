package com.cbs.channel.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelConfigResponse {
    private Long id;
    private String channel;
    private String displayName;
    private Boolean isEnabled;
    private List<String> featuresEnabled;
    private List<String> transactionTypes;
    private BigDecimal maxTransferAmount;
    private BigDecimal dailyLimit;
    private Integer sessionTimeoutSecs;
    private String operatingHours;
    private String maintenanceWindow;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
    private Long version;
}
