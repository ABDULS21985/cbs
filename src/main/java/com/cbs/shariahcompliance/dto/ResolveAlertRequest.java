package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveAlertRequest {

    @NotBlank(message = "Resolution is required")
    private String resolution;

    @NotBlank(message = "Resolution status is required")
    private String resolutionStatus;

    private boolean generateSnci;
}
