package com.cbs.account.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterestRateOverrideRequest {

    @NotNull(message = "Override rate is required")
    @DecimalMin(value = "0", message = "Rate must be >= 0")
    @DecimalMax(value = "100", message = "Rate must be <= 100")
    private BigDecimal overrideRate;

    @NotBlank(message = "Reason is required")
    @Size(min = 10, message = "Reason must be at least 10 characters")
    private String reason;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;

    @NotNull(message = "Expiry date is required")
    private LocalDate expiryDate;
}
