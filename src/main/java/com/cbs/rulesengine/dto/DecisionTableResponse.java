package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.entity.DecisionTableHitPolicy;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionTableResponse {
    private Long id;
    private Long ruleId;
    private String tableName;
    private String description;
    private List<Map<String, Object>> inputColumns;
    private List<Map<String, Object>> outputColumns;
    private DecisionTableHitPolicy hitPolicy;
    private BusinessRuleStatus status;
    private Integer tableVersion;
    private Long tenantId;
    private List<DecisionTableRowResponse> rows;
    private Instant createdAt;
    private Instant updatedAt;
}
