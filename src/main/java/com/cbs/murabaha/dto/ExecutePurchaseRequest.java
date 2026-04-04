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
public class ExecutePurchaseRequest {

    @NotBlank
    private String purchaseBrokerName;

    private Long purchaseBrokerId;

    @NotBlank
    private String purchaseOrderRef;

    @NotNull
    private LocalDate purchaseDate;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal purchasePrice;

    @NotNull
    @DecimalMin("0.000001")
    private BigDecimal quantity;

    @NotBlank
    private String unit;

    private String purchaseCurrency;
    private String commodityGrade;
    private String marketReference;
}
