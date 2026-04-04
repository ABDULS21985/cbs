package com.cbs.gl.islamic.dto;

import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.entity.ReserveType;
import com.cbs.gl.entity.ShariahClassification;
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
public class CreateIslamicGLAccountRequest {
    @NotBlank
    private String glCode;
    @NotBlank
    private String glName;
    private GlCategory glCategory;
    private String glSubCategory;
    private String parentGlCode;
    private Integer levelNumber;
    private Boolean isHeader;
    private Boolean isPostable;
    private String currencyCode;
    private Boolean isMultiCurrency;
    private String branchCode;
    private Boolean isInterBranch;
    private NormalBalance normalBalance;
    private Boolean allowManualPosting;
    private Boolean requiresCostCentre;
    @NotNull
    private IslamicAccountCategory islamicAccountCategory;
    private String contractTypeCode;
    private Long investmentPoolId;
    private ShariahClassification shariahClassification;
    private String aaoifiReference;
    private String aaoifiLineItem;
    private Boolean profitDistributionEligible;
    private String profitDistributionPool;
    private Boolean zakatApplicable;
    private BigDecimal purificationPercentage;
    private String contraAccountCode;
    private Boolean isReserveAccount;
    private ReserveType reserveType;
    private LocalDate lastReviewDate;
    private LocalDate nextReviewDate;
    private String reviewedBy;
    private String notes;
}
