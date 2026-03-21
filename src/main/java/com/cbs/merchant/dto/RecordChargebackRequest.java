package com.cbs.merchant.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordChargebackRequest {

    @NotNull(message = "Merchant ID is required")
    private Long merchantId;

    @Size(max = 40, message = "Transaction ref must not exceed 40 characters")
    private String originalTransactionRef;

    private LocalDate transactionDate;

    @DecimalMin(value = "0.00", message = "Transaction amount must be >= 0")
    private BigDecimal transactionAmount;

    @Size(max = 15, message = "Card network must not exceed 15 characters")
    private String cardNetwork;

    @Size(max = 10, message = "Reason code must not exceed 10 characters")
    private String reasonCode;

    @Size(max = 200, message = "Reason description must not exceed 200 characters")
    private String reasonDescription;

    @NotNull(message = "Chargeback amount is required")
    @DecimalMin(value = "0.01", message = "Chargeback amount must be > 0")
    private BigDecimal chargebackAmount;

    @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO code")
    private String currency;

    private LocalDate evidenceDeadline;
}
