package com.cbs.rulesengine.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionTableRowRequest {

    @NotNull
    private Integer rowNumber;

    @NotEmpty
    private List<Map<String, Object>> inputValues;

    @NotEmpty
    private List<Map<String, Object>> outputValues;

    private String description;

    @Builder.Default
    private Boolean isActive = true;

    private Integer priority;
}
