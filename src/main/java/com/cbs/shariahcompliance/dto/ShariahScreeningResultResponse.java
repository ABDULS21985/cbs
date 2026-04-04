package com.cbs.shariahcompliance.dto;

import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShariahScreeningResultResponse {
    private Long id;
    private String screeningRef;
    private String transactionRef;
    private String transactionType;
    private BigDecimal transactionAmount;
    private String transactionCurrency;
    private String contractRef;
    private String contractTypeCode;
    private Long customerId;
    private String counterpartyName;
    private String merchantCategoryCode;
    private ScreeningOverallResult overallResult;
    private int rulesEvaluated;
    private int rulesPassed;
    private int rulesFailed;
    private int rulesAlerted;
    private List<Map<String, Object>> ruleResults;
    private ScreeningActionTaken actionTaken;
    private String blockReason;
    private String blockReasonAr;
    private Long alertId;
    private LocalDateTime screenedAt;
    private String screenedBy;
    private long processingTimeMs;
    private Long tenantId;
}
