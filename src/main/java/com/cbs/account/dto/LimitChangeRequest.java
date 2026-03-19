package com.cbs.account.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LimitChangeRequest {

    @NotBlank(message = "Limit type is required")
    private String limitType;

    @NotNull(message = "New value is required")
    @DecimalMin(value = "0", message = "Limit value must be >= 0")
    private BigDecimal newValue;

    @NotBlank(message = "Reason is required")
    private String reason;
}
