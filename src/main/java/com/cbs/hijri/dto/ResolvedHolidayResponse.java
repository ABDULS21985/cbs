package com.cbs.hijri.dto;

import com.cbs.hijri.entity.HijriHolidayType;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResolvedHolidayResponse {
    private Long holidayId;
    private String name;
    private String nameAr;
    private LocalDate gregorianDateFrom;
    private LocalDate gregorianDateTo;
    private HijriHolidayType holidayType;
    private Integer hijriYear;
    private Integer hijriMonth;
}
