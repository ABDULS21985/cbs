package com.cbs.rulesengine.dto;

import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.entity.DecisionTableHitPolicy;
import jakarta.validation.constraints.NotBlank;
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
public class CreateDecisionTableRequest {

    @NotBlank
    private String tableName;

    private String description;

    @NotEmpty
    private List<Map<String, Object>> inputColumns;

    @NotEmpty
    private List<Map<String, Object>> outputColumns;

    @NotNull
    private DecisionTableHitPolicy hitPolicy;

    @Builder.Default
    private BusinessRuleStatus status = BusinessRuleStatus.DRAFT;
}
