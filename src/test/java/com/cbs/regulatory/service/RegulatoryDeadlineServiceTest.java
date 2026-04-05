package com.cbs.regulatory.service;

import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegulatoryDeadlineServiceTest {

    @Mock
    private HijriCalendarService hijriCalendarService;

    @InjectMocks
    private RegulatoryDeadlineService deadlineService;

    @Test
    void calculateDeadline_usesIslamicBusinessDaysWhenConfigured() {
        RegulatoryReturnTemplate template = RegulatoryReturnTemplate.builder()
                .filingDeadlineDaysAfterPeriod(3)
                .filingDeadlineBusinessDays(true)
                .filingCalendarCode("ISLAMIC_GCC")
                .build();

        when(hijriCalendarService.isIslamicBusinessDay(LocalDate.of(2026, 4, 1))).thenReturn(false);
        when(hijriCalendarService.isIslamicBusinessDay(LocalDate.of(2026, 4, 2))).thenReturn(true);
        when(hijriCalendarService.isIslamicBusinessDay(LocalDate.of(2026, 4, 3))).thenReturn(true);
        when(hijriCalendarService.isIslamicBusinessDay(LocalDate.of(2026, 4, 4))).thenReturn(false);
        when(hijriCalendarService.isIslamicBusinessDay(LocalDate.of(2026, 4, 5))).thenReturn(true);

        LocalDate deadline = deadlineService.calculateDeadline(template, LocalDate.of(2026, 3, 31));

        assertThat(deadline).isEqualTo(LocalDate.of(2026, 4, 5));
    }

    @Test
    void isOverdue_ignoresAlreadySubmittedReturns() {
        RegulatoryReturn regulatoryReturn = RegulatoryReturn.builder()
                .status(RegulatoryDomainEnums.ReturnStatus.SUBMITTED)
                .filingDeadline(LocalDate.of(2026, 4, 1))
                .build();

        assertThat(deadlineService.isOverdue(regulatoryReturn, LocalDate.of(2026, 4, 5))).isFalse();
    }
}
