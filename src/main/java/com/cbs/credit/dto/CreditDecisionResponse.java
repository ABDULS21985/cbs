package com.cbs.credit.dto;

import com.cbs.credit.entity.CreditDecision;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreditDecisionResponse {
    private Long id;
    private Long applicationId;
    private String applicationNumber;
    private Long customerId;
    private String modelCode;
    private Integer score;
    private String riskGrade;
    private CreditDecision decision;
    private List<String> decisionReasons;
    private BigDecimal recommendedAmount;
    private BigDecimal recommendedRate;
    private Integer recommendedTenure;
    private Boolean wasOverridden;
    private String overrideDecision;
    private String overrideBy;
    private String overrideReason;
    private Instant executedAt;
    private Integer executionTimeMs;
}
