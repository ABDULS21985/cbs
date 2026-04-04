package com.cbs.rulesengine.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionEvaluationRequest {

    @NotNull
    private Map<String, Object> inputs;
}
