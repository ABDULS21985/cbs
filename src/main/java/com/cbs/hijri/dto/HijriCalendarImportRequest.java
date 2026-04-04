package com.cbs.hijri.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HijriCalendarImportRequest {

    @NotNull
    private Integer hijriYear;

    @NotBlank
    private String source;

    @Valid
    @NotEmpty
    private List<HijriDateMappingImportItem> mappings;
}
