package com.cbs.gl.islamic.dto;

import com.cbs.gl.islamic.entity.PerRetentionAllocation;
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
public class PerPolicyRequest {
    @NotBlank
    private String policyCode;
    @NotBlank
    private String name;
    private String nameAr;
    @NotNull
    private Long investmentPoolId;
    private BigDecimal retentionRate;
    private BigDecimal maximumRetentionRate;
    private BigDecimal releaseThreshold;
    private BigDecimal targetDistributionRate;
    private BigDecimal maximumReserveBalance;
    private BigDecimal maximumReservePercentOfPool;
    private Boolean retentionFromBankShare;
    private PerRetentionAllocation retentionAllocation;
    private Boolean approvalRequired;
    private Long fatwaId;
    private LocalDate ssbReviewDate;
    private LocalDate nextSsbReviewDate;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
