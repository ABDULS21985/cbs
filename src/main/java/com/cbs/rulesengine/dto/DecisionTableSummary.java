package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.entity.DecisionTableHitPolicy;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionTableSummary {
    private Long id;
    private String tableName;
    private DecisionTableHitPolicy hitPolicy;
    private BusinessRuleStatus status;
    private Integer tableVersion;
    private Instant updatedAt;
}
