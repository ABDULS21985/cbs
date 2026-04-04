package com.cbs.qard.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QardRepaymentRequest {

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    private Long sourceAccountId;
    private String narration;
    private String externalRef;
}
