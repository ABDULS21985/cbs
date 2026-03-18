package com.cbs.contributionrisk;

import com.cbs.contributionrisk.entity.BusinessContribution;
import com.cbs.contributionrisk.repository.BusinessContributionRepository;
import com.cbs.contributionrisk.service.BusinessContributionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessContributionServiceTest {

    @Mock
    private BusinessContributionRepository repository;

    @InjectMocks
    private BusinessContributionService service;

    @Test
    @DisplayName("costToIncomeRatio = totalCost / totalRevenue × 100")
    void costToIncomeRatioCalculatedCorrectly() {
        BusinessContribution contribution = new BusinessContribution();
        contribution.setPeriodType("MONTHLY");
        contribution.setPeriodDate(LocalDate.of(2026, 3, 1));
        contribution.setBusinessUnit("RETAIL");
        contribution.setTotalRevenue(new BigDecimal("5000000"));
        contribution.setTotalCost(new BigDecimal("3000000"));
        contribution.setNetProfit(new BigDecimal("2000000"));
        contribution.setRwaAmount(new BigDecimal("20000000"));

        when(repository.findByPeriodDateAndPeriodType(any(LocalDate.class), eq("MONTHLY")))
                .thenReturn(List.of());
        when(repository.save(any(BusinessContribution.class))).thenAnswer(i -> i.getArgument(0));

        BusinessContribution result = service.calculate(contribution);

        // costToIncomeRatio = 3,000,000 / 5,000,000 × 100 = 60.0000
        assertThat(result.getCostToIncomeRatio()).isEqualByComparingTo(new BigDecimal("60.0000"));
    }

    @Test
    @DisplayName("RAROC = netProfit / RWA × 100")
    void returnOnRwaCalculatedCorrectly() {
        BusinessContribution contribution = new BusinessContribution();
        contribution.setPeriodType("QUARTERLY");
        contribution.setPeriodDate(LocalDate.of(2026, 3, 31));
        contribution.setBusinessUnit("CORPORATE");
        contribution.setTotalRevenue(new BigDecimal("8000000"));
        contribution.setTotalCost(new BigDecimal("4000000"));
        contribution.setNetProfit(new BigDecimal("4000000"));
        contribution.setRwaAmount(new BigDecimal("50000000"));

        when(repository.findByPeriodDateAndPeriodType(any(LocalDate.class), eq("QUARTERLY")))
                .thenReturn(List.of());
        when(repository.save(any(BusinessContribution.class))).thenAnswer(i -> i.getArgument(0));

        BusinessContribution result = service.calculate(contribution);

        // RAROC = 4,000,000 / 50,000,000 × 100 = 8.0000
        assertThat(result.getReturnOnRwa()).isEqualByComparingTo(new BigDecimal("8.0000"));
    }
}
