package com.cbs.hijri.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Entity
@Table(
        name = "hijri_date_mapping",
        schema = "cbs",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_hijri_date_mapping_triplet_tenant",
                        columnNames = {"hijri_year", "hijri_month", "hijri_day", "tenant_id"}),
                @UniqueConstraint(name = "uk_hijri_date_mapping_gregorian_tenant",
                        columnNames = {"gregorian_date", "tenant_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HijriDateMapping extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hijri_year", nullable = false)
    private Integer hijriYear;

    @Column(name = "hijri_month", nullable = false)
    private Integer hijriMonth;

    @Column(name = "hijri_day", nullable = false)
    private Integer hijriDay;

    @Column(name = "gregorian_date", nullable = false)
    private LocalDate gregorianDate;

    @Column(name = "hijri_month_name", nullable = false, length = 40)
    private String hijriMonthName;

    @Column(name = "hijri_month_name_ar", nullable = false, length = 40)
    private String hijriMonthNameAr;

    @Column(name = "day_of_week", nullable = false, length = 15)
    private String dayOfWeek;

    @Column(name = "source", nullable = false, length = 30)
    private String source;

    @Column(name = "tenant_id")
    private Long tenantId;
}
