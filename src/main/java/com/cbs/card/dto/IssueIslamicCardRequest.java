package com.cbs.card.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueIslamicCardRequest {

    @NotNull(message = "accountId is required")
    private Long accountId;

    @NotBlank(message = "productCode is required")
    private String productCode;

    private Long customerId;
    private String cardholderName;
    private String cardTier;
    private String restrictionProfileCode;
    private LocalDate expiryDate;
    private BigDecimal dailyPosLimit;
    private BigDecimal dailyAtmLimit;
    private BigDecimal dailyOnlineLimit;
    private BigDecimal singleTxnLimit;
    private String deliveryMethod;
    private String branchCode;
}