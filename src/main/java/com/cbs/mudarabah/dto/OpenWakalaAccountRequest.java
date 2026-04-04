package com.cbs.mudarabah.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OpenWakalaAccountRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "Product code is required")
    private String productCode;

    @NotBlank(message = "Currency code is required")
    private String currencyCode;

    @NotNull(message = "Initial deposit is required")
    @DecimalMin(value = "0.01", message = "Initial deposit must be greater than zero")
    private BigDecimal initialDeposit;

    private Long branchId;

    @NotBlank(message = "Wakala type is required")
    private String wakalaType;

    private BigDecimal wakalahFeeRate;
    private BigDecimal wakalahFeeAmount;
    private String feeFrequency;
    private String investmentMandate;
    private String investmentMandateAr;

    @NotBlank(message = "Account sub type is required")
    private String accountSubType;

    private Integer tenorDays;
    private String maturityInstruction;

    @AssertTrue(message = "Loss disclosure must be accepted")
    private boolean lossDisclosureAccepted;

    private String riskLevel;
}
