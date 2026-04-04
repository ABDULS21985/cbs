package com.cbs.murabaha.dto;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MurabahaContractResponse {

    private Long id;
    private String contractRef;
    private Long applicationId;
    private Long customerId;
    private Long accountId;
    private String productCode;
    private String contractTypeCode;
    private MurabahaDomainEnums.MurabahahType murabahahType;
    private String assetDescription;
    private MurabahaDomainEnums.AssetCategory assetCategory;
    private BigDecimal costPrice;
    private BigDecimal markupRate;
    private BigDecimal markupAmount;
    private BigDecimal sellingPrice;
    private Boolean sellingPriceLocked;
    private Instant sellingPriceLockedAt;
    private BigDecimal downPayment;
    private BigDecimal financedAmount;
    private Integer tenorMonths;
    private LocalDate startDate;
    private LocalDate firstInstallmentDate;
    private LocalDate maturityDate;
    private MurabahaDomainEnums.RepaymentFrequency repaymentFrequency;
    private BigDecimal totalDeferredProfit;
    private BigDecimal recognisedProfit;
    private BigDecimal unrecognisedProfit;
    private MurabahaDomainEnums.ProfitRecognitionMethod profitRecognitionMethod;
    private Boolean ownershipVerified;
    private String ownershipVerifiedBy;
    private Instant ownershipVerifiedAt;
    private Boolean latePenaltiesToCharity;
    private BigDecimal totalLatePenaltiesCharged;
    private BigDecimal totalCharityDonations;
    private MurabahaDomainEnums.EarlySettlementRebateMethod earlySettlementRebateMethod;
    private LocalDate earlySettledAt;
    private BigDecimal earlySettlementAmount;
    private BigDecimal ibraAmount;
    private MurabahaDomainEnums.ContractStatus status;
    private Instant executedAt;
    private String executedBy;
    private Long investmentPoolId;
    private Long poolAssetAssignmentId;
    private Long settlementAccountId;
}
