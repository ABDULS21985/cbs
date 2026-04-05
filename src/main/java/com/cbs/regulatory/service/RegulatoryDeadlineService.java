package com.cbs.regulatory.service;

import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RegulatoryDeadlineService {

    private static final Set<DayOfWeek> STANDARD_WEEKEND = Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);

    private final HijriCalendarService hijriCalendarService;

    public LocalDate calculateDeadline(RegulatoryReturnTemplate template, LocalDate periodEnd) {
        if (template == null || periodEnd == null) {
            return periodEnd;
        }
        boolean businessDays = Boolean.TRUE.equals(template.getFilingDeadlineBusinessDays());
        String calendarCode = normalizeCalendar(template.getFilingCalendarCode());
        LocalDate deadline = addDays(periodEnd, template.getFilingDeadlineDaysAfterPeriod(), businessDays, calendarCode);
        if (!businessDays && usesIslamicCalendar(calendarCode)) {
            return hijriCalendarService.getNextIslamicBusinessDay(deadline);
        }
        if (!businessDays && usesGregorianBusinessCalendar(calendarCode)) {
            return nextGregorianBusinessDay(deadline);
        }
        return deadline;
    }

    public boolean isOverdue(RegulatoryReturn regulatoryReturn, LocalDate asOfDate) {
        if (regulatoryReturn == null || regulatoryReturn.getFilingDeadline() == null) {
            return false;
        }
        return switch (regulatoryReturn.getStatus()) {
            case SUBMITTED, ACKNOWLEDGED, FINAL -> false;
            default -> (asOfDate != null ? asOfDate : LocalDate.now()).isAfter(regulatoryReturn.getFilingDeadline());
        };
    }

    public LocalDate addDays(LocalDate from, int days, boolean businessDays, String calendarCode) {
        if (from == null || days <= 0) {
            return from;
        }
        if (!businessDays) {
            return from.plusDays(days);
        }
        LocalDate cursor = from;
        int counted = 0;
        while (counted < days) {
            cursor = cursor.plusDays(1);
            if (isBusinessDay(cursor, calendarCode)) {
                counted++;
            }
        }
        return cursor;
    }

    private boolean isBusinessDay(LocalDate date, String calendarCode) {
        if (usesIslamicCalendar(calendarCode)) {
            return hijriCalendarService.isIslamicBusinessDay(date);
        }
        return !STANDARD_WEEKEND.contains(date.getDayOfWeek());
    }

    private LocalDate nextGregorianBusinessDay(LocalDate date) {
        LocalDate cursor = date;
        while (STANDARD_WEEKEND.contains(cursor.getDayOfWeek())) {
            cursor = cursor.plusDays(1);
        }
        return cursor;
    }

    private boolean usesIslamicCalendar(String calendarCode) {
        return "ISLAMIC_GCC".equals(calendarCode) || "ISLAMIC".equals(calendarCode);
    }

    private boolean usesGregorianBusinessCalendar(String calendarCode) {
        return "GREGORIAN_BUSINESS".equals(calendarCode);
    }

    private String normalizeCalendar(String calendarCode) {
        return StringUtils.hasText(calendarCode) ? calendarCode.trim().toUpperCase() : "CALENDAR_DAYS";
    }
}
