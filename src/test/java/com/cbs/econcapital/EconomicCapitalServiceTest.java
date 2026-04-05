package com.cbs.econcapital;

import com.cbs.econcapital.entity.EconomicCapital;
import com.cbs.econcapital.repository.EconomicCapitalRepository;
import com.cbs.econcapital.service.EconomicCapitalService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class EconomicCapitalServiceTest {

    @Mock private EconomicCapitalRepository repository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private EconomicCapitalService service;

    private EconomicCapital buildEc(BigDecimal ecCap, BigDecimal available, BigDecimal allocated, BigDecimal unexpectedLoss) {
        return EconomicCapital.builder()
                .calcDate(LocalDate.of(2026, 3, 21))
                .riskType("CREDIT")
                .economicCapital(ecCap)
                .availableCapital(available)
                .allocatedCapital(allocated)
                .unexpectedLoss(unexpectedLoss)
                .businessUnit("CORPORATE_BANKING")
                .build();
    }

    @Test
    @DisplayName("Calculate computes capital surplus when available > economic capital")
    void surplusComputedCorrectly() {
        EconomicCapital ec = buildEc(
                new BigDecimal("5000000"),
                new BigDecimal("7000000"),
                new BigDecimal("6000000"),
                new BigDecimal("4500000")
        );
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        EconomicCapital result = service.calculate(ec);

        // Surplus = available - economic = 7M - 5M = 2M
        assertThat(result.getCapitalSurplusDeficit()).isEqualByComparingTo("2000000");
    }

    @Test
    @DisplayName("Calculate computes capital deficit when available < economic capital")
    void deficitComputedCorrectly() {
        EconomicCapital ec = buildEc(
                new BigDecimal("10000000"),
                new BigDecimal("7000000"),
                new BigDecimal("8000000"),
                new BigDecimal("6000000")
        );
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        EconomicCapital result = service.calculate(ec);

        // Deficit = available - economic = 7M - 10M = -3M
        assertThat(result.getCapitalSurplusDeficit()).isEqualByComparingTo("-3000000");
    }

    @Test
    @DisplayName("RAROC calculated as unexpectedLoss / allocatedCapital * 100")
    void rarocCalculatedCorrectly() {
        EconomicCapital ec = buildEc(
                new BigDecimal("5000000"),
                new BigDecimal("7000000"),
                new BigDecimal("8000000"),
                new BigDecimal("1200000")
        );
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        EconomicCapital result = service.calculate(ec);

        // RAROC = (1,200,000 / 8,000,000) * 100 = 15.0000%
        assertThat(result.getRarocPct()).isEqualByComparingTo("15.0000");
    }

    @Test
    @DisplayName("RAROC not calculated when allocatedCapital is null")
    void rarocSkippedWhenAllocatedCapitalNull() {
        EconomicCapital ec = buildEc(
                new BigDecimal("5000000"),
                new BigDecimal("7000000"),
                null,
                new BigDecimal("1200000")
        );
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        EconomicCapital result = service.calculate(ec);

        assertThat(result.getRarocPct()).isNull();
    }

    @Test
    @DisplayName("RAROC not calculated when allocatedCapital is zero")
    void rarocSkippedWhenAllocatedCapitalZero() {
        EconomicCapital ec = buildEc(
                new BigDecimal("5000000"),
                new BigDecimal("7000000"),
                BigDecimal.ZERO,
                new BigDecimal("1200000")
        );
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        EconomicCapital result = service.calculate(ec);

        assertThat(result.getRarocPct()).isNull();
    }

    @Test
    @DisplayName("Capital surplus null when available capital is null")
    void surplusNullWhenAvailableNull() {
        EconomicCapital ec = buildEc(
                new BigDecimal("5000000"),
                null,
                new BigDecimal("6000000"),
                new BigDecimal("1200000")
        );
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        EconomicCapital result = service.calculate(ec);

        assertThat(result.getCapitalSurplusDeficit()).isNull();
    }

    @Test
    @DisplayName("getByDate delegates to repository")
    void getByDateDelegatesToRepo() {
        LocalDate date = LocalDate.of(2026, 3, 21);
        List<EconomicCapital> expected = List.of(buildEc(new BigDecimal("5000000"), new BigDecimal("7000000"), null, null));
        when(repository.findByCalcDateOrderByRiskTypeAsc(date)).thenReturn(expected);

        List<EconomicCapital> result = service.getByDate(date);

        assertThat(result).hasSize(1);
        verify(repository).findByCalcDateOrderByRiskTypeAsc(date);
    }

    @Test
    @DisplayName("getByBusinessUnit filters by date and business unit")
    void getByBusinessUnitDelegatesToRepo() {
        LocalDate date = LocalDate.of(2026, 3, 21);
        when(repository.findByCalcDateAndBusinessUnitOrderByRiskTypeAsc(date, "RETAIL")).thenReturn(List.of());

        List<EconomicCapital> result = service.getByBusinessUnit(date, "RETAIL");

        assertThat(result).isEmpty();
        verify(repository).findByCalcDateAndBusinessUnitOrderByRiskTypeAsc(date, "RETAIL");
    }
}
