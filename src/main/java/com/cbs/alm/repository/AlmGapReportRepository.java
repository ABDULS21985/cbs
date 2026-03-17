package com.cbs.alm.repository;

import com.cbs.alm.entity.AlmGapReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.*;

@Repository
public interface AlmGapReportRepository extends JpaRepository<AlmGapReport, Long> {
    Optional<AlmGapReport> findByReportDateAndCurrencyCode(LocalDate date, String ccy);
    List<AlmGapReport> findByReportDateOrderByCurrencyCodeAsc(LocalDate date);
}
