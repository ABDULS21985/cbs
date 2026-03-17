package com.cbs.segmentation.dto;

import com.cbs.segmentation.entity.RuleOperator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SegmentRuleDto {

    private Long id;

    @NotBlank(message = "Field name is required")
    private String fieldName;

    @NotNull(message = "Operator is required")
    private RuleOperator operator;

    @NotBlank(message = "Field value is required")
    private String fieldValue;

    private String fieldValueTo;
    private Integer logicalGroup;
    private Boolean isActive;
}
