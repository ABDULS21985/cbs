package com.cbs.branch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.Map;

public record SaveScheduleRequest(
        @NotBlank(message = "Staff ID is required")
        String staffId,

        String staffName,

        String role,

        @NotNull(message = "Week start date is required")
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "weekOf must be in yyyy-MM-dd format")
        String weekOf,

        @NotEmpty(message = "At least one schedule entry is required")
        Map<String, @Pattern(regexp = "MORNING|AFTERNOON|FULL_DAY|OFF|ON_LEAVE",
                message = "Shift type must be one of: MORNING, AFTERNOON, FULL_DAY, OFF, ON_LEAVE") String> schedule
) {}
