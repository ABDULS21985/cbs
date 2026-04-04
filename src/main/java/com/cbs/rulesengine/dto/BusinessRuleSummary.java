package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleCategory;
import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.entity.RuleSeverity;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRuleSummary {
    private Long id;
    private String ruleCode;
    private String name;
    private BusinessRuleCategory category;
    private BusinessRuleStatus status;
    private RuleSeverity severity;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Integer priority;
}
