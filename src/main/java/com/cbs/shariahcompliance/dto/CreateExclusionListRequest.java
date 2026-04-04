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
public class CreateExclusionListRequest {

    @NotBlank(message = "List code is required")
    private String listCode;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotBlank(message = "List type is required")
    private String listType;
}
