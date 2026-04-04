package com.cbs.hijri.repository;

import com.cbs.hijri.entity.HijriDateMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HijriDateMappingRepository extends JpaRepository<HijriDateMapping, Long> {

    Optional<HijriDateMapping> findByGregorianDateAndTenantId(LocalDate gregorianDate, Long tenantId);

    Optional<HijriDateMapping> findByGregorianDateAndTenantIdIsNull(LocalDate gregorianDate);

    Optional<HijriDateMapping> findByHijriYearAndHijriMonthAndHijriDayAndTenantId(
            Integer hijriYear, Integer hijriMonth, Integer hijriDay, Long tenantId);

    Optional<HijriDateMapping> findByHijriYearAndHijriMonthAndHijriDayAndTenantIdIsNull(
            Integer hijriYear, Integer hijriMonth, Integer hijriDay);

    List<HijriDateMapping> findByHijriYearAndHijriMonthAndTenantIdOrderByHijriDayAsc(
            Integer hijriYear, Integer hijriMonth, Long tenantId);

    List<HijriDateMapping> findByHijriYearAndHijriMonthAndTenantIdIsNullOrderByHijriDayAsc(
            Integer hijriYear, Integer hijriMonth);

    List<HijriDateMapping> findByGregorianDateBetweenAndTenantIdOrderByGregorianDateAsc(
            LocalDate from, LocalDate to, Long tenantId);

    List<HijriDateMapping> findByGregorianDateBetweenAndTenantIdIsNullOrderByGregorianDateAsc(
            LocalDate from, LocalDate to);

    boolean existsByHijriYearAndTenantId(Integer hijriYear, Long tenantId);

    boolean existsByHijriYearAndTenantIdIsNull(Integer hijriYear);

    @Query("select max(m.hijriYear) from HijriDateMapping m where m.tenantId = :tenantId")
    Integer findMaxHijriYearByTenantId(Long tenantId);

    @Query("select max(m.hijriYear) from HijriDateMapping m where m.tenantId is null")
    Integer findMaxHijriYearGlobal();

    List<HijriDateMapping> findByTenantIdOrderByHijriYearAscHijriMonthAscHijriDayAsc(Long tenantId);

    List<HijriDateMapping> findByTenantIdIsNullOrderByHijriYearAscHijriMonthAscHijriDayAsc();
}
