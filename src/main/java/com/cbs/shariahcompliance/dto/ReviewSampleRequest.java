package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSampleRequest {

    @NotBlank(message = "Compliance result is required")
    private String complianceResult;

    private List<Map<String, Object>> evidenceCollected;
    private List<Map<String, Object>> checklistResults;
    private String notes;
}
