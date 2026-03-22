package com.cbs.channel.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SaveChannelConfigRequest {

    private Long id;

    @NotBlank(message = "Channel code is required")
    @Size(max = 20, message = "Channel code must not exceed 20 characters")
    private String channel;

    @NotBlank(message = "Display name is required")
    @Size(max = 50, message = "Display name must not exceed 50 characters")
    private String displayName;

    private Boolean isEnabled;

    private List<String> featuresEnabled;

    private List<String> transactionTypes;

    @DecimalMin(value = "0.00", message = "Max transfer amount must be non-negative")
    private BigDecimal maxTransferAmount;

    @DecimalMin(value = "0.00", message = "Daily limit must be non-negative")
    private BigDecimal dailyLimit;

    @NotNull(message = "Session timeout is required")
    @Min(value = 60, message = "Session timeout must be at least 60 seconds")
    private Integer sessionTimeoutSecs;

    @Size(max = 200, message = "Operating hours must not exceed 200 characters")
    private String operatingHours;

    @Size(max = 100, message = "Maintenance window must not exceed 100 characters")
    private String maintenanceWindow;

    private Boolean isActive;
}
