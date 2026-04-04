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
public class AddExclusionEntryRequest {

    @NotBlank(message = "Entry value is required")
    private String entryValue;

    private String entryDescription;
    private String reason;
}
