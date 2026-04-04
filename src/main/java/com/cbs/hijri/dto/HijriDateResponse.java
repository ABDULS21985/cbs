package com.cbs.hijri.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HijriDateResponse {
    private Integer hijriYear;
    private Integer hijriMonth;
    private Integer hijriDay;
    private String hijriMonthName;
    private String hijriMonthNameAr;
    private LocalDate gregorianDate;
    private String dayOfWeek;
    private Boolean isHoliday;
    private Boolean isBusinessDay;
}
