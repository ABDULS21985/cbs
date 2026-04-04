package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleCategory;
import com.cbs.rulesengine.entity.BusinessRuleType;
import com.cbs.rulesengine.entity.RuleSeverity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBusinessRuleRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Z0-9_]{3,100}$", message = "ruleCode must be uppercase alphanumeric with underscores")
    private String ruleCode;

    @NotBlank
    @Size(min = 3, max = 500)
    private String name;

    @Size(max = 500)
    private String nameAr;

    @Size(max = 4000)
    private String description;

    @Size(max = 4000)
    private String descriptionAr;

    @NotNull
    private BusinessRuleCategory category;

    @Size(max = 120)
    private String subCategory;

    @NotNull
    private BusinessRuleType ruleType;

    @NotNull
    private RuleSeverity severity;

    private String evaluationExpression;

    @Builder.Default
    private Map<String, Object> parameters = Map.of();

    @Size(max = 500)
    private String errorMessage;

    @Size(max = 500)
    private String errorMessageAr;

    @Builder.Default
    private List<String> applicableProducts = List.of("*");

    @Builder.Default
    private List<String> applicableModules = List.of();

    @NotNull
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @Builder.Default
    @Positive
    private Integer priority = 100;

    @Size(max = 150)
    private String shariahBoardResolution;

    @AssertTrue(message = "evaluationExpression is required for this rule type")
    @JsonIgnore
    public boolean isEvaluationExpressionValid() {
        if (ruleType == null) {
            return true;
        }
        return switch (ruleType) {
            case CONSTRAINT, VALIDATION, CALCULATION, ELIGIBILITY ->
                    evaluationExpression != null && !evaluationExpression.isBlank();
            default -> true;
        };
    }

    @AssertTrue(message = "effectiveFrom must not be in the past")
    @JsonIgnore
    public boolean isEffectiveFromValid() {
        return effectiveFrom == null || !effectiveFrom.isBefore(LocalDate.now());
    }

    @AssertTrue(message = "effectiveTo must be after effectiveFrom")
    @JsonIgnore
    public boolean isEffectiveToValid() {
        return effectiveFrom == null || effectiveTo == null || effectiveTo.isAfter(effectiveFrom);
    }
}
