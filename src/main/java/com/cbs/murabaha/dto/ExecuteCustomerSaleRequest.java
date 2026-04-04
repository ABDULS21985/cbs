package com.cbs.murabaha.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecuteCustomerSaleRequest {

    @NotBlank
    private String customerSaleBrokerName;

    private Long customerSaleBrokerId;

    @NotBlank
    private String customerSaleOrderRef;

    @NotNull
    private LocalDate customerSaleDate;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal customerSalePrice;

    private BigDecimal customerSalePricePerUnit;
    private String customerSaleConfirmationRef;
    private LocalDate settlementDate;

    @NotNull
    private Long creditedAccountId;
}
