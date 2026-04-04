package com.cbs.rulesengine.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionTableRowResponse {
    private Long id;
    private Integer rowNumber;
    private List<Map<String, Object>> inputValues;
    private List<Map<String, Object>> outputValues;
    private String description;
    private Boolean isActive;
    private Integer priority;
    private Instant createdAt;
    private Instant updatedAt;
}
