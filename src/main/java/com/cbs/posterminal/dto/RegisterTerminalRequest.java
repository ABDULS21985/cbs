package com.cbs.posterminal.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterTerminalRequest {

    @NotBlank(message = "Terminal ID is required")
    @Size(max = 30, message = "Terminal ID must not exceed 30 characters")
    private String terminalId;

    @NotBlank(message = "Terminal type is required")
    @Size(max = 20, message = "Terminal type must not exceed 20 characters")
    private String terminalType;

    @NotBlank(message = "Merchant ID is required")
    @Size(max = 80, message = "Merchant ID must not exceed 80 characters")
    private String merchantId;

    @NotBlank(message = "Merchant name is required")
    @Size(max = 200, message = "Merchant name must not exceed 200 characters")
    private String merchantName;

    @Size(max = 10, message = "Merchant category code must not exceed 10 characters")
    private String merchantCategoryCode;

    private String locationAddress;

    private Boolean supportsContactless;
    private Boolean supportsChip;
    private Boolean supportsMagstripe;
    private Boolean supportsPin;
    private Boolean supportsQr;

    @DecimalMin(value = "0.00", message = "Max transaction amount must be >= 0")
    private BigDecimal maxTransactionAmount;

    @Size(max = 20, message = "Acquiring bank code must not exceed 20 characters")
    private String acquiringBankCode;

    private Long settlementAccountId;

    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "Batch settlement time must be in HH:mm format")
    private String batchSettlementTime;

    @Size(max = 30, message = "Software version must not exceed 30 characters")
    private String softwareVersion;
}
