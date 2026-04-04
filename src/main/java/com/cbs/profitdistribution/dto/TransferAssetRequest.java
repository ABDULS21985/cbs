package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransferAssetRequest {

    @NotNull(message = "New pool ID is required")
    private Long newPoolId;

    @NotNull(message = "Transfer amount is required")
    private BigDecimal transferAmount;

    private String reason;
}
