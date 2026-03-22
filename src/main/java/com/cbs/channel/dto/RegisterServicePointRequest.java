package com.cbs.channel.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegisterServicePointRequest {

    @NotBlank(message = "Service point name is required")
    @Size(max = 200, message = "Service point name must not exceed 200 characters")
    private String servicePointName;

    @NotBlank(message = "Service point type is required")
    @Size(max = 20, message = "Service point type must not exceed 20 characters")
    private String servicePointType;

    private Long locationId;

    @Size(max = 80, message = "Device ID must not exceed 80 characters")
    private String deviceId;

    private Map<String, Object> supportedServices;

    private Map<String, Object> operatingHours;

    private Boolean isAccessible;

    private Boolean staffRequired;

    @Size(max = 80, message = "Assigned staff ID must not exceed 80 characters")
    private String assignedStaffId;

    @Min(value = 1, message = "Max concurrent customers must be at least 1")
    private Integer maxConcurrentCustomers;

    @Min(value = 1, message = "Average service time must be at least 1 minute")
    private Integer avgServiceTimeMinutes;

    @Size(max = 15, message = "Status must not exceed 15 characters")
    private String status;
}
