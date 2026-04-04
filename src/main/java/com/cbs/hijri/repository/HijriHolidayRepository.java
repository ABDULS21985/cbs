package com.cbs.hijri.repository;

import com.cbs.hijri.entity.HijriHoliday;
import com.cbs.hijri.entity.HijriHolidayStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HijriHolidayRepository extends JpaRepository<HijriHoliday, Long> {

    List<HijriHoliday> findByHijriMonthAndStatusAndTenantIdOrderByHijriDayFromAsc(
            Integer hijriMonth, HijriHolidayStatus status, Long tenantId);

    List<HijriHoliday> findByHijriMonthAndStatusAndTenantIdIsNullOrderByHijriDayFromAsc(
            Integer hijriMonth, HijriHolidayStatus status);

    List<HijriHoliday> findByTenantIdAndStatusOrderByHijriMonthAscHijriDayFromAsc(
            Long tenantId, HijriHolidayStatus status);

    List<HijriHoliday> findByTenantIdIsNullAndStatusOrderByHijriMonthAscHijriDayFromAsc(
            HijriHolidayStatus status);
}
