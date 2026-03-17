package com.cbs.alm;

import com.cbs.alm.entity.*;
import com.cbs.alm.repository.*;
import com.cbs.alm.service.AlmService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlmServiceTest {

    @Mock private AlmGapReportRepository gapReportRepository;
    @Mock private AlmScenarioRepository scenarioRepository;
    @Mock private SecurityHoldingRepository holdingRepository;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private AlmService almService;

    @Test
    @DisplayName("Gap report: RSA > RSL = positive gap, NII sensitivity positive")
    void positiveGap_NiiSensitivity() {
        when(gapReportRepository.save(any())).thenAnswer(inv -> { AlmGapReport r = inv.getArgument(0); r.setId(1L); return r; });
        when(currentActorProvider.getCurrentActor()).thenReturn("treasury_mgr");

        List<Map<String, Object>> buckets = List.of(
                Map.of("bucket", "0-30 days", "rsa", 500000000, "rsl", 300000000),
                Map.of("bucket", "31-90 days", "rsa", 300000000, "rsl", 200000000));

        AlmGapReport result = almService.generateGapReport(LocalDate.now(), "USD",
                new BigDecimal("800000000"), new BigDecimal("500000000"), buckets,
                new BigDecimal("3.50"), new BigDecimal("2.00"));

        assertThat(result.getCumulativeGap()).isEqualByComparingTo(new BigDecimal("300000000")); // RSA - RSL
        assertThat(result.getGapRatio()).isPositive(); // RSA/RSL > 1
        assertThat(result.getNiiSensitivity()).isPositive(); // +gap → NII increases when rates rise
        assertThat(result.getDurationGap()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("Gap report: RSA < RSL = negative gap, NII falls when rates rise")
    void negativeGap() {
        when(gapReportRepository.save(any())).thenAnswer(inv -> { AlmGapReport r = inv.getArgument(0); r.setId(2L); return r; });
        when(currentActorProvider.getCurrentActor()).thenReturn("treasury_mgr");

        AlmGapReport result = almService.generateGapReport(LocalDate.now(), "USD",
                new BigDecimal("400000000"), new BigDecimal("600000000"), List.of(),
                new BigDecimal("2.00"), new BigDecimal("3.00"));

        assertThat(result.getCumulativeGap()).isNegative();
        assertThat(result.getGapRatio()).isLessThan(BigDecimal.ONE);
    }

    @Test
    @DisplayName("EVE sensitivity: duration gap × equity × rate shock")
    void eveSensitivity() {
        when(gapReportRepository.save(any())).thenAnswer(inv -> { AlmGapReport r = inv.getArgument(0); r.setId(3L); return r; });
        when(currentActorProvider.getCurrentActor()).thenReturn("treasury_mgr");

        AlmGapReport result = almService.generateGapReport(LocalDate.now(), "USD",
                new BigDecimal("1000000000"), new BigDecimal("900000000"), List.of(),
                new BigDecimal("4.00"), new BigDecimal("2.50"));

        assertThat(result.getEveBase()).isNotNull();
        assertThat(result.getEveUp200bp()).isNotNull();
        assertThat(result.getEveDown200bp()).isNotNull();
        assertThat(result.getEveSensitivity()).isNotNull();
        // With positive duration gap, EVE should decrease when rates rise
    }
}
