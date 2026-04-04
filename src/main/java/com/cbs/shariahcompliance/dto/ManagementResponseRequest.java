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
public class ManagementResponseRequest {

    @NotBlank(message = "Response is required")
    private String response;

    @NotBlank(message = "Responded by is required")
    private String respondedBy;
}
