package com.cbs.mudarabah.dto;

import com.cbs.mudarabah.entity.MudarabahType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OpenMudarabahSavingsRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "Product code is required")
    private String productCode;

    @NotBlank(message = "Currency code is required")
    @Builder.Default
    private String currencyCode = "SAR";

    @NotNull(message = "Initial deposit is required")
    @DecimalMin(value = "0.01", message = "Initial deposit must be greater than zero")
    private BigDecimal initialDeposit;

    private Long branchId;

    @NotNull(message = "Mudarabah type is required")
    private MudarabahType mudarabahType;

    private String restrictionDetails;

    private BigDecimal profitSharingRatioCustomer;

    private BigDecimal profitSharingRatioBank;

    private boolean profitReinvest;

    @AssertTrue(message = "Loss disclosure must be accepted")
    private boolean lossDisclosureAccepted;

    private Long profitDistributionAccountId;
}
