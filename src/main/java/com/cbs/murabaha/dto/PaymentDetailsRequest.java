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
public class PaymentDetailsRequest {

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal purchasePrice;

    private BigDecimal negotiatedPrice;

    @NotBlank
    private String invoiceRef;

    @NotNull
    private LocalDate invoiceDate;

    @NotNull
    private LocalDate paymentDate;

    @NotBlank
    private String paymentReference;
}
