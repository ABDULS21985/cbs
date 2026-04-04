package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisbursementPlan {

    @NotNull(message = "Recipient ID is required")
    private Long recipientId;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    private String purpose;
}
