package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbCertificationPackage {

    private String runRef;
    private String poolCode;
    private LocalDate periodFrom;
    private LocalDate periodTo;

    private BigDecimal grossIncome;
    private Map<String, BigDecimal> incomeBySource;
    private BigDecimal charityIncomeExcluded;
    private boolean charityProperlySegregated;

    private BigDecimal totalExpenses;
    private Map<String, BigDecimal> expenseByType;

    private BigDecimal perBalance;
    private BigDecimal perMovement;
    private String perPolicyReference;
    private BigDecimal irrBalance;
    private BigDecimal irrMovement;
    private String irrPolicyReference;

    private BigDecimal netDistributableProfit;
    private BigDecimal bankMudaribShare;
    private BigDecimal depositorPool;
    private int participantCount;
    private BigDecimal averageRate;
    private BigDecimal minRate;
    private BigDecimal maxRate;

    private boolean psrAppliedAsContracted;
    private boolean noFixedReturnGuaranteed;
    private boolean lossAllocatedToCapitalProviders;
    private boolean charityIncomeExcludedFromPool;
    private boolean poolGenuinelySegregated;
    private boolean reservesWithinApprovedLimits;

    private List<String> complianceNotes;
}
