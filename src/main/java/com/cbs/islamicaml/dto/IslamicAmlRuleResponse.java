package com.cbs.islamicaml.dto;

import com.cbs.islamicaml.entity.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicAmlRuleResponse {
    private Long id;
    private Long baseAmlRuleId;
    private String ruleCode;
    private String name;
    private String description;
    private IslamicAmlRuleCategory category;
    private List<String> islamicProductContext;
    private DetectionMethod detectionMethod;
    private Map<String, Object> ruleParameters;
    private int lookbackPeriodDays;
    private int minimumOccurrences;
    private String alertSeverity;
    private AmlAlertAction alertAction;
    private EscalationLevel escalationLevel;
    private String fatfTypology;
    private String gccGuidelineRef;
    private boolean enabled;
    private LocalDate effectiveFrom;
    private int priority;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
}
