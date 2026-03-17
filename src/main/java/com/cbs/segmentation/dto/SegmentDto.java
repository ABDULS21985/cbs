package com.cbs.segmentation.dto;

import com.cbs.segmentation.entity.RuleOperator;
import com.cbs.segmentation.entity.SegmentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SegmentDto {

    private Long id;

    @NotBlank(message = "Segment code is required")
    @Size(max = 30)
    private String code;

    @NotBlank(message = "Segment name is required")
    @Size(max = 100)
    private String name;

    private String description;

    @NotNull(message = "Segment type is required")
    private SegmentType segmentType;

    private Integer priority;
    private Boolean isActive;
    private String colorCode;
    private String icon;
    private Long customerCount;

    @Valid
    private List<SegmentRuleDto> rules;

    private Instant createdAt;
    private Instant updatedAt;
}
