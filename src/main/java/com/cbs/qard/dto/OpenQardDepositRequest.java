package com.cbs.qard.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpenQardDepositRequest {

    @NotNull
    private Long customerId;

    @NotBlank
    private String productCode;

    @Builder.Default
    private String currencyCode = "SAR";

    @DecimalMin("0.00")
    private BigDecimal openingBalance;

    private String branchCode;

    @Builder.Default
    private boolean noReturnDisclosed = true;
}
