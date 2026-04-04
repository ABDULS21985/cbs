package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRuleResponse {
    private Long id;
    private String ruleCode;
    private String name;
    private String nameAr;
    private String description;
    private String descriptionAr;
    private BusinessRuleCategory category;
    private String subCategory;
    private BusinessRuleType ruleType;
    private RuleSeverity severity;
    private String evaluationExpression;
    private Map<String, Object> parameters;
    private String errorMessage;
    private String errorMessageAr;
    private List<String> applicableProducts;
    private List<String> applicableModules;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private BusinessRuleStatus status;
    private Integer priority;
    private String shariahBoardResolution;
    private String approvedBy;
    private Instant approvedAt;
    private Long tenantId;
    private Integer currentVersion;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
}
