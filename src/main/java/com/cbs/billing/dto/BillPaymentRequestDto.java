package com.cbs.billing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillPaymentRequestDto {

    @NotNull(message = "Debit account ID is required")
    private Long debitAccountId;

    @NotBlank(message = "Biller code is required")
    private String billerCode;

    @NotBlank(message = "Biller customer ID is required")
    private String billerCustomerId;

    private String billerCustomerName;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;
}
