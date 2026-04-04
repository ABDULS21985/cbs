package com.cbs.hijri.dto;

import com.cbs.hijri.entity.HijriHolidayStatus;
import com.cbs.hijri.entity.HijriHolidayType;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HijriHolidayResponse {
    private Long id;
    private String name;
    private String nameAr;
    private HijriHolidayType holidayType;
    private Integer hijriMonth;
    private Integer hijriDayFrom;
    private Integer hijriDayTo;
    private Integer durationDays;
    private Integer year;
    private Boolean affectsSettlement;
    private Boolean affectsTrading;
    private Boolean affectsProfit;
    private Long tenantId;
    private HijriHolidayStatus status;
    private String notes;
    private LocalDate gregorianDateFrom;
    private LocalDate gregorianDateTo;
    private Instant createdAt;
    private Instant updatedAt;
}
