package com.cbs.hijri.dto;

import com.cbs.hijri.entity.HijriHolidayType;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HijriHolidayRequest {

    @NotBlank
    @Size(max = 120)
    private String name;

    @Size(max = 120)
    private String nameAr;

    @NotNull
    private HijriHolidayType holidayType;

    @NotNull
    @Min(1)
    @Max(12)
    private Integer hijriMonth;

    @NotNull
    @Min(1)
    @Max(30)
    private Integer hijriDayFrom;

    @NotNull
    @Min(1)
    @Max(30)
    private Integer hijriDayTo;

    @NotNull
    @Min(1)
    @Max(30)
    private Integer durationDays;

    private Integer year;

    @Builder.Default
    private Boolean affectsSettlement = false;

    @Builder.Default
    private Boolean affectsTrading = false;

    @Builder.Default
    private Boolean affectsProfit = false;

    @Size(max = 500)
    private String notes;

    @AssertTrue(message = "Hijri holiday date range must be valid")
    public boolean isDateRangeValid() {
        return hijriDayFrom == null || hijriDayTo == null || hijriDayFrom <= hijriDayTo;
    }
}
