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
public class PlaceHoldRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Hold amount must be greater than zero")
    @Digits(integer = 16, fraction = 2)
    private BigDecimal amount;

    @NotBlank(message = "Reason is required")
    @Size(max = 500)
    private String reason;

    @Size(max = 40)
    private String reference;

    @Size(max = 20)
    private String holdType;

    private LocalDate releaseDate;
}
