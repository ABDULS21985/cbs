package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRuleSearchRequest {
    private String query;
    private BusinessRuleCategory category;
    private String subCategory;
    private BusinessRuleStatus status;
    private BusinessRuleType ruleType;
    private RuleSeverity severity;
    private String productCode;
    private String moduleName;
    @Builder.Default
    private Integer page = 0;
    @Builder.Default
    private Integer size = 20;
    @Builder.Default
    private String sortBy = "updatedAt";
    @Builder.Default
    private String sortDir = "desc";
}
