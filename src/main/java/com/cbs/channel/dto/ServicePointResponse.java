package com.cbs.channel.dto;

import lombok.*;
import java.time.Instant;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServicePointResponse {
    private Long id;
    private String servicePointCode;
    private String servicePointName;
    private String servicePointType;
    private Long locationId;
    private String deviceId;
    private Map<String, Object> supportedServices;
    private Map<String, Object> operatingHours;
    private Boolean isAccessible;
    private Boolean staffRequired;
    private String assignedStaffId;
    private Integer maxConcurrentCustomers;
    private Integer avgServiceTimeMinutes;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
