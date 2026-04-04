package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.DecisionTableHitPolicy;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionResultResponse {
    private Boolean matched;
    private Map<String, Object> outputs;
    private List<Map<String, Object>> matchedOutputs;
    private List<Long> matchedRowIds;
    private DecisionTableHitPolicy hitPolicy;
}
