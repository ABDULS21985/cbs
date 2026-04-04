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
public class ProcessMurabahaRepaymentRequest {

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal paymentAmount;

    @NotNull
    private LocalDate paymentDate;

    private Long debitAccountId;
    private String externalRef;
    private String narration;
}
