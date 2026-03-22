package com.cbs.branch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record SwapShiftRequest(
        @NotBlank(message = "First staff ID is required")
        String staffId1,

        @NotBlank(message = "Second staff ID is required")
        String staffId2,

        @NotNull(message = "First date is required")
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "date1 must be in yyyy-MM-dd format")
        String date1,

        @NotNull(message = "Second date is required")
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "date2 must be in yyyy-MM-dd format")
        String date2,

        String reason
) {}
