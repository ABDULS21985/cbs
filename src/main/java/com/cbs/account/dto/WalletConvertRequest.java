package com.cbs.account.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletConvertRequest {

    @NotNull(message = "Source wallet ID is required")
    private Long sourceWalletId;

    @NotNull(message = "Target wallet ID is required")
    private Long targetWalletId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 16, fraction = 2)
    private BigDecimal amount;

    @NotNull(message = "Exchange rate is required")
    @DecimalMin(value = "0.00000001", message = "Rate must be positive")
    private BigDecimal rate;
}
