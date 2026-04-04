package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateScreeningRuleRequest {

    @NotBlank(message = "Rule code is required")
    private String ruleCode;

    private String name;
    private String nameAr;
    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Action is required")
    private String action;

    private String severity;

    @NotBlank(message = "Rule type is required")
    private String ruleType;

    private String businessRuleCode;
    private String conditionExpression;
    private String thresholdField;
    private String thresholdOperator;
    private BigDecimal thresholdValue;
    private String referenceListCode;

    @NotNull(message = "Effective from date is required")
    private LocalDate effectiveFrom;

    private List<String> applicableTransactionTypes;
    private List<String> applicableContractTypes;
    private String shariahReference;
    private Integer priority;
}
