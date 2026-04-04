package com.cbs.wadiah.dto;

import com.cbs.wadiah.entity.WadiahDomainEnums;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateHibahPolicyRequest {

    @NotBlank
    private String policyCode;

    @NotBlank
    private String name;

    private String nameAr;
    private String description;
    private BigDecimal minimumBalanceForEligibility;
    private Integer minimumDaysActive;
    private Boolean excludeDormantAccounts;
    private Boolean excludeBlockedAccounts;
    private Integer maximumDistributionsPerYear;
    private Integer minimumDaysBetweenDistributions;
    private BigDecimal maximumHibahRatePerAnnum;
    private WadiahDomainEnums.HibahVariabilityRequirement variabilityRequirement;
    private Integer maximumConsecutiveSameRate;
    private BigDecimal maximumTotalDistributionPerPeriod;
    private String fundingSourceGl;
    private Long fatwaId;
    private Boolean approvalRequired;
    private WadiahDomainEnums.SsbReviewFrequency ssbReviewFrequency;
    private LocalDate lastSsbReview;
    private LocalDate nextSsbReview;
}
