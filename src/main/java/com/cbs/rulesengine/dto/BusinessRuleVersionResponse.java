package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleVersionChangeType;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRuleVersionResponse {
    private Integer versionNumber;
    private BusinessRuleVersionChangeType changeType;
    private String changeDescription;
    private String changedBy;
    private String approvedBy;
    private String approvalReference;
    private Instant effectiveFrom;
    private Instant effectiveTo;
    private Map<String, Object> ruleSnapshot;
    private List<Map<String, Object>> decisionTableSnapshot;
}
