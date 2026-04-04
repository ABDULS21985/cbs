package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateIslamicAmlRuleRequest {

    @NotBlank(message = "Rule code is required")
    private String ruleCode;

    private String name;
    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    private List<String> islamicProductContext;

    @NotBlank(message = "Detection method is required")
    private String detectionMethod;

    private Map<String, Object> ruleParameters;
    private Integer lookbackPeriodDays;
    private Integer minimumOccurrences;
    private String alertSeverity;
    private String alertAction;
    private String escalationLevel;
    private String fatfTypology;
    private String gccGuidelineRef;
    private LocalDate effectiveFrom;
    private Integer priority;
}
