package com.cbs.hijri;

import com.cbs.audit.service.AuditService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.SystemParameterRepository;
import com.cbs.hijri.entity.HijriDateMapping;
import com.cbs.hijri.repository.HijriDateMappingRepository;
import com.cbs.hijri.repository.HijriHolidayRepository;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HijriCalendarServiceTest {

    @Mock
    private HijriDateMappingRepository hijriDateMappingRepository;

    @Mock
    private HijriHolidayRepository hijriHolidayRepository;

    @Mock
    private SystemParameterRepository systemParameterRepository;

    @Mock
    private CurrentTenantResolver currentTenantResolver;

    @Mock
    private CurrentActorProvider currentActorProvider;

    @Mock
    private AuditService auditService;

    private HijriCalendarService service;

    @BeforeEach
    void setUp() {
        service = new HijriCalendarService(
                hijriDateMappingRepository,
                hijriHolidayRepository,
                systemParameterRepository,
                currentTenantResolver,
                currentActorProvider,
                auditService
        );
    }

    @Test
    void fallbackConversionMatchesKnownHijriBoundary() {
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(null);
        when(hijriDateMappingRepository.findByGregorianDateAndTenantIdIsNull(LocalDate.of(2024, 7, 7)))
                .thenReturn(Optional.empty());
        when(systemParameterRepository.findEffective("weekend.days", null)).thenReturn(List.of());
        when(hijriHolidayRepository.findByTenantIdIsNullAndStatusOrderByHijriMonthAscHijriDayFromAsc(
                com.cbs.hijri.entity.HijriHolidayStatus.ACTIVE)).thenReturn(List.of());

        var response = service.toHijri(LocalDate.of(2024, 7, 7));

        assertThat(response.getHijriYear()).isEqualTo(1446);
        assertThat(response.getHijriMonth()).isEqualTo(1);
        assertThat(response.getHijriDay()).isEqualTo(1);
        assertThat(response.getHijriMonthName()).isEqualTo("Muharram");
    }

    @Test
    void weekendConfigMakesFridayOrSaturdayNonBusinessDayByTenant() {
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(systemParameterRepository.findEffective("weekend.days", 1L)).thenReturn(List.of(SystemParameter.builder()
                .paramKey("weekend.days")
                .paramCategory("ISLAMIC_CALENDAR")
                .paramValue("FRIDAY,SATURDAY")
                .valueType("STRING")
                .build()));

        boolean businessDay = service.isIslamicBusinessDay(LocalDate.of(2024, 7, 12));

        assertThat(businessDay).isFalse();
    }
}
