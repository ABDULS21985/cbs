package com.cbs.shariahcompliance.dto;

import com.cbs.shariahcompliance.entity.ScreeningAction;
import com.cbs.shariahcompliance.entity.ScreeningCategory;
import com.cbs.shariahcompliance.entity.ScreeningPoint;
import com.cbs.shariahcompliance.entity.ScreeningRuleType;
import com.cbs.shariahcompliance.entity.ScreeningSeverity;
import com.cbs.shariahcompliance.entity.ThresholdOperator;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreeningRuleResponse {
    private Long id;
    private String ruleCode;
    private String name;
    private String nameAr;
    private String description;
    private String descriptionAr;
    private ScreeningCategory category;
    private List<String> applicableTransactionTypes;
    private List<String> applicableContractTypes;
    private ScreeningPoint screeningPoint;
    private ScreeningAction action;
    private ScreeningSeverity severity;
    private ScreeningRuleType ruleType;
    private String businessRuleCode;
    private String conditionExpression;
    private String thresholdField;
    private ThresholdOperator thresholdOperator;
    private BigDecimal thresholdValue;
    private BigDecimal thresholdValueTo;
    private String referenceListCode;
    private String shariahReference;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private boolean enabled;
    private int priority;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version;
}
