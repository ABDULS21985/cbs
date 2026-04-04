package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.entity.DecisionTableHitPolicy;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDecisionTableRequest {
    private String tableName;
    private String description;
    private List<Map<String, Object>> inputColumns;
    private List<Map<String, Object>> outputColumns;
    private DecisionTableHitPolicy hitPolicy;
    private BusinessRuleStatus status;
}
