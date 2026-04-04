package com.cbs.hijri;

import com.cbs.AbstractIntegrationTest;
import com.cbs.hijri.dto.HijriCalendarImportRequest;
import com.cbs.hijri.dto.HijriDateMappingImportItem;
import com.cbs.hijri.dto.HijriHolidayRequest;
import com.cbs.hijri.entity.HijriHolidayType;
import com.cbs.hijri.service.HijriCalendarService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HijriCalendarIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private HijriCalendarService hijriCalendarService;

    @Test
    void seededMappingsConvertKnownBoundaryDates() {
        var hijri = hijriCalendarService.toHijri(LocalDate.of(2024, 7, 7));
        LocalDate gregorian = hijriCalendarService.toGregorian(1446, 1, 1);

        assertThat(hijri.getHijriYear()).isEqualTo(1446);
        assertThat(hijri.getHijriMonth()).isEqualTo(1);
        assertThat(hijri.getHijriDay()).isEqualTo(1);
        assertThat(gregorian).isEqualTo(LocalDate.of(2024, 7, 7));
    }

    @Test
    void seededEidHolidayIsResolvedAndSkipsToNextBusinessDay() {
        LocalDate eidStart = hijriCalendarService.toGregorian(1446, 10, 1);
        LocalDate eidEnd = hijriCalendarService.toGregorian(1446, 10, 3);

        assertThat(hijriCalendarService.isHijriHoliday(eidStart)).isTrue();
        assertThat(hijriCalendarService.getHolidaysInRange(eidStart, eidEnd))
                .extracting(item -> item.getName())
                .contains("Eid al-Fitr");

        LocalDate nextBusinessDay = hijriCalendarService.getNextIslamicBusinessDay(eidStart);
        assertThat(nextBusinessDay).isAfter(eidEnd);
        assertThat(hijriCalendarService.isIslamicBusinessDay(nextBusinessDay)).isTrue();
    }

    @Test
    void holidayCrudLifecycleWorks() {
        var created = hijriCalendarService.createHoliday(HijriHolidayRequest.builder()
                .name("Test Islamic Holiday")
                .nameAr("عطلة اختبار")
                .holidayType(HijriHolidayType.OBSERVANCE)
                .hijriMonth(8)
                .hijriDayFrom(15)
                .hijriDayTo(15)
                .durationDays(1)
                .affectsSettlement(false)
                .affectsTrading(false)
                .affectsProfit(true)
                .notes("Integration test holiday")
                .build());

        assertThat(created.getId()).isNotNull();

        var updated = hijriCalendarService.updateHoliday(created.getId(), HijriHolidayRequest.builder()
                .name("Updated Islamic Holiday")
                .holidayType(HijriHolidayType.OBSERVANCE)
                .hijriMonth(8)
                .hijriDayFrom(16)
                .hijriDayTo(16)
                .durationDays(1)
                .affectsSettlement(false)
                .affectsTrading(false)
                .affectsProfit(false)
                .notes("Updated")
                .build());

        assertThat(updated.getName()).isEqualTo("Updated Islamic Holiday");
        hijriCalendarService.deactivateHoliday(created.getId());

        assertThat(hijriCalendarService.getActiveHolidays())
                .extracting(item -> item.getHolidayId())
                .doesNotContain(created.getId());
    }

    @Test
    void importCreatesCoverageEntryForNewYear() {
        hijriCalendarService.importHijriCalendar(HijriCalendarImportRequest.builder()
                .hijriYear(1450)
                .source("MANUAL")
                .mappings(List.of(
                        HijriDateMappingImportItem.builder().hijriMonth(1).hijriDay(1).gregorianDate(LocalDate.of(2028, 5, 25)).build(),
                        HijriDateMappingImportItem.builder().hijriMonth(1).hijriDay(2).gregorianDate(LocalDate.of(2028, 5, 26)).build(),
                        HijriDateMappingImportItem.builder().hijriMonth(1).hijriDay(3).gregorianDate(LocalDate.of(2028, 5, 27)).build()
                ))
                .build());

        assertThat(hijriCalendarService.getCoverage().getCoverage())
                .anySatisfy(item -> {
                    assertThat(item.getHijriYear()).isEqualTo(1450);
                    assertThat(item.getMonthsCovered()).isEqualTo(1);
                });
    }
}
