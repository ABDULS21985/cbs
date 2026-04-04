package com.cbs.murabaha.dto;

import jakarta.validation.constraints.DecimalMin;
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
public class EarlySettlementRequest {

    @NotNull
    private LocalDate settlementDate;

    @DecimalMin("0.00")
    private BigDecimal ibraAmount;

    private Long debitAccountId;
    private String externalRef;
}
