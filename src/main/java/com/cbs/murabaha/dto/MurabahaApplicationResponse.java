package com.cbs.murabaha.dto;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MurabahaApplicationResponse {

    private Long id;
    private String applicationRef;
    private Long customerId;
    private String productCode;
    private MurabahaDomainEnums.MurabahahType murabahahType;
    private BigDecimal requestedAmount;
    private String currencyCode;
    private Integer requestedTenorMonths;
    private MurabahaDomainEnums.Purpose purpose;
    private String purposeDescription;
    private BigDecimal dsr;
    private BigDecimal dsrLimit;
    private Integer creditScore;
    private BigDecimal proposedCostPrice;
    private BigDecimal proposedMarkupRate;
    private BigDecimal proposedSellingPrice;
    private BigDecimal proposedDownPayment;
    private Integer proposedTenorMonths;
    private BigDecimal proposedInstallmentAmount;
    private MurabahaDomainEnums.ApplicationStatus status;
    private String currentStep;
    private String approvedBy;
    private Instant approvedAt;
    private BigDecimal approvedAmount;
    private Integer approvedTenorMonths;
    private BigDecimal approvedMarkupRate;
    private Long contractId;
    private String contractRef;
    private Instant submittedAt;
    private Instant expiresAt;

    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}
