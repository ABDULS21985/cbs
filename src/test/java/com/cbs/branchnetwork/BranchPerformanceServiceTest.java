package com.cbs.branchnetwork;

import com.cbs.branchnetwork.entity.BranchPerformance;
import com.cbs.branchnetwork.repository.BranchPerformanceRepository;
import com.cbs.branchnetwork.service.BranchPerformanceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BranchPerformanceServiceTest {

    @Mock
    private BranchPerformanceRepository repository;

    @InjectMocks
    private BranchPerformanceService service;

    @Test
    @DisplayName("recordPerformance sets status to CALCULATED")
    void recordPerformanceSetsCalculatedStatus() {
        BranchPerformance perf = new BranchPerformance();
        perf.setBranchId(1L);
        perf.setPeriodType("MONTHLY");
        perf.setPeriodDate(LocalDate.of(2025, 3, 31));
        perf.setTotalRevenue(new BigDecimal("5000000"));
        perf.setOperatingCost(new BigDecimal("3000000"));

        when(repository.save(any(BranchPerformance.class))).thenAnswer(i -> {
            BranchPerformance saved = Objects.requireNonNull(i.getArgument(0, BranchPerformance.class));
            saved.setId(1L);
            return saved;
        });

        BranchPerformance result = service.recordPerformance(perf);

        assertThat(result.getStatus()).isEqualTo("CALCULATED");
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getUnderperformers filters branches above cost-to-income threshold")
    void getUnderperformersFiltersByThreshold() {
        LocalDate period = LocalDate.of(2025, 3, 31);

        BranchPerformance good = new BranchPerformance();
        good.setBranchId(1L);
        good.setCostToIncomeRatio(new BigDecimal("55.00"));

        BranchPerformance bad = new BranchPerformance();
        bad.setBranchId(2L);
        bad.setCostToIncomeRatio(new BigDecimal("85.00"));

        BranchPerformance noCost = new BranchPerformance();
        noCost.setBranchId(3L);
        noCost.setCostToIncomeRatio(null);

        when(repository.findByPeriodDateAndPeriodType(period, "MONTHLY"))
                .thenReturn(List.of(good, bad, noCost));

        List<BranchPerformance> underperformers = service.getUnderperformers(period, "MONTHLY", new BigDecimal("70.00"));

        assertThat(underperformers).hasSize(1);
        assertThat(underperformers.get(0).getBranchId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("getDigitalMigrationReport returns branches sorted by digital adoption descending")
    void getDigitalMigrationReportSortedDescending() {
        LocalDate period = LocalDate.of(2025, 3, 31);

        BranchPerformance b1 = new BranchPerformance();
        b1.setBranchId(10L);
        b1.setDigitalAdoptionPct(new BigDecimal("45.00"));

        BranchPerformance b2 = new BranchPerformance();
        b2.setBranchId(20L);
        b2.setDigitalAdoptionPct(new BigDecimal("72.50"));

        BranchPerformance b3 = new BranchPerformance();
        b3.setBranchId(30L);
        b3.setDigitalAdoptionPct(new BigDecimal("60.00"));

        when(repository.findByPeriodDateAndPeriodType(period, "QUARTERLY"))
                .thenReturn(List.of(b1, b2, b3));

        List<BranchPerformance> report = service.getDigitalMigrationReport(period, "QUARTERLY");

        assertThat(report).extracting(BranchPerformance::getBranchId)
                .containsExactly(20L, 30L, 10L);
    }
}
