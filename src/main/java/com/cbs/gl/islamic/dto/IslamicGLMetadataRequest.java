package com.cbs.gl.islamic.dto;

import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.entity.ReserveType;
import com.cbs.gl.entity.ShariahClassification;
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
public class IslamicGLMetadataRequest {
    private String contractTypeCode;
    private Long investmentPoolId;
    private IslamicAccountCategory islamicAccountCategory;
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
