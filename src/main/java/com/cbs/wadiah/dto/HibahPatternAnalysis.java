package com.cbs.wadiah.dto;

import com.cbs.mudarabah.entity.RiskLevel;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HibahPatternAnalysis {

    private int distributionsInLast12Months;
    private BigDecimal averageRate;
    private BigDecimal rateStandardDeviation;
    private BigDecimal rateCoefficientOfVariation;
    private boolean frequencyRegular;
    private boolean rateStable;
    private RiskLevel systematicRisk;
    private List<String> alerts;
}
