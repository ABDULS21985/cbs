package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleCategory;
import com.cbs.rulesengine.entity.BusinessRuleType;
import com.cbs.rulesengine.entity.RuleSeverity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateBusinessRuleRequest {

    @Size(min = 3, max = 500)
    private String name;

    @Size(max = 500)
    private String nameAr;

    @Size(max = 4000)
    private String description;

    @Size(max = 4000)
    private String descriptionAr;

    private BusinessRuleCategory category;

    @Size(max = 120)
    private String subCategory;

    private BusinessRuleType ruleType;

    private RuleSeverity severity;

    private String evaluationExpression;

    private Map<String, Object> parameters;

    @Size(max = 500)
    private String errorMessage;

    @Size(max = 500)
    private String errorMessageAr;

    private List<String> applicableProducts;

    private List<String> applicableModules;

    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @Positive
    private Integer priority;

    @Size(max = 150)
    private String shariahBoardResolution;

    @AssertTrue(message = "effectiveTo must be after effectiveFrom")
    @JsonIgnore
    public boolean isEffectiveToValid() {
        return effectiveFrom == null || effectiveTo == null || effectiveTo.isAfter(effectiveFrom);
    }
}
