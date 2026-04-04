package com.cbs.hijri.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HijriDateMappingImportItem {

    @NotNull
    @Min(1)
    @Max(12)
    private Integer hijriMonth;

    @NotNull
    @Min(1)
    @Max(30)
    private Integer hijriDay;

    @NotNull
    private LocalDate gregorianDate;
}
