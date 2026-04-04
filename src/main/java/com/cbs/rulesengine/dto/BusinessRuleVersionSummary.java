package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleVersionChangeType;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRuleVersionSummary {
    private Integer versionNumber;
    private BusinessRuleVersionChangeType changeType;
    private String changeDescription;
    private String changedBy;
    private Instant effectiveFrom;
    private Instant effectiveTo;
}
