package com.cbs.wadiah.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WadiahDepositRequest {

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    private String narration;
    private String channel;
    private String externalRef;
}
