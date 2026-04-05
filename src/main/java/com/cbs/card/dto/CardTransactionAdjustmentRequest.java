package com.cbs.card.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardTransactionAdjustmentRequest {

    @Positive(message = "amount must be greater than zero when provided")
    private BigDecimal amount;

    @NotBlank(message = "reason is required")
    private String reason;
}