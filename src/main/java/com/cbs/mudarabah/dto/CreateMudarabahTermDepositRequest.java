package com.cbs.mudarabah.dto;

import com.cbs.mudarabah.entity.MudarabahType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateMudarabahTermDepositRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "Product code is required")
    private String productCode;

    @NotBlank(message = "Currency code is required")
    private String currencyCode;

    @NotNull(message = "Principal amount is required")
    @DecimalMin(value = "0.01", message = "Principal amount must be greater than zero")
    private BigDecimal principalAmount;

    @Min(value = 1, message = "Tenor must be at least 1 day")
    private int tenorDays;

    private Long branchId;

    @NotNull(message = "Funding account ID is required")
    private Long fundingAccountId;

    private MudarabahType mudarabahType;

    private BigDecimal profitSharingRatioCustomer;

    private BigDecimal profitSharingRatioBank;

    private String profitDistributionFrequency;

    @NotBlank(message = "Maturity instruction is required")
    private String maturityInstruction;

    private Long payoutAccountId;

    private boolean autoRenew;

    private BigDecimal renewalPsrCustomer;

    private BigDecimal renewalPsrBank;

    private Integer renewalTenorDays;

    private boolean earlyWithdrawalAllowed;

    @AssertTrue(message = "Loss disclosure must be accepted")
    private boolean lossDisclosureAccepted;

    private String externalReference;
}
