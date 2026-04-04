package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAuditFindingRequest {

    @NotNull(message = "Audit ID is required")
    private Long auditId;

    private Long sampleId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Severity is required")
    private String severity;

    private String shariahRuleViolated;
    private String impact;
    private String recommendation;
    private boolean hasSnciImplication;
    private BigDecimal snciAmount;
}
