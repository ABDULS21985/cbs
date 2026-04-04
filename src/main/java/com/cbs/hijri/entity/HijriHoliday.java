package com.cbs.hijri.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "hijri_holiday", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HijriHoliday extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "name_ar", length = 120)
    private String nameAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "holiday_type", nullable = false, length = 30)
    private HijriHolidayType holidayType;

    @Column(name = "hijri_month", nullable = false)
    private Integer hijriMonth;

    @Column(name = "hijri_day_from", nullable = false)
    private Integer hijriDayFrom;

    @Column(name = "hijri_day_to", nullable = false)
    private Integer hijriDayTo;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "holiday_year")
    private Integer year;

    @Column(name = "affects_settlement", nullable = false)
    @Builder.Default
    private Boolean affectsSettlement = false;

    @Column(name = "affects_trading", nullable = false)
    @Builder.Default
    private Boolean affectsTrading = false;

    @Column(name = "affects_profit", nullable = false)
    @Builder.Default
    private Boolean affectsProfit = false;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private HijriHolidayStatus status = HijriHolidayStatus.ACTIVE;

    @Column(name = "notes", length = 500)
    private String notes;
}
