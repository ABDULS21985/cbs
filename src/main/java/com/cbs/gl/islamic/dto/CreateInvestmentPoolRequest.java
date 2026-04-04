package com.cbs.gl.islamic.dto;

import com.cbs.gl.islamic.entity.ManagementFeeType;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.entity.PoolType;
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
public class CreateInvestmentPoolRequest {
    @NotBlank
    private String poolCode;
    @NotBlank
    private String name;
    private String nameAr;
    @NotNull
    private PoolType poolType;
    @NotBlank
    private String currencyCode;
    private String description;
    private String investmentPolicy;
    private String restrictionDetails;
    private BigDecimal bankSharePercentage;
    private BigDecimal profitSharingRatioBank;
    private BigDecimal profitSharingRatioInvestors;
    private Long perPolicyId;
    private Long irrPolicyId;
    private ManagementFeeType managementFeeType;
    private BigDecimal managementFeeRate;
    private PoolStatus status;
    private LocalDate inceptionDate;
    private LocalDate maturityDate;
    private Long fatwaId;
    private String glAssetAccountCode;
    private String glLiabilityAccountCode;
    private String glProfitAccountCode;
    private String glPerAccountCode;
    private String glIrrAccountCode;
}
