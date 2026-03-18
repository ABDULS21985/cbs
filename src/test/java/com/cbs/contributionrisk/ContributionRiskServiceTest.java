package com.cbs.contributionrisk;
import com.cbs.contributionrisk.entity.RiskContribution;
import com.cbs.contributionrisk.repository.RiskContributionRepository;
import com.cbs.contributionrisk.service.ContributionRiskService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContributionRiskServiceTest {
    @Mock private RiskContributionRepository repository;
    @InjectMocks private ContributionRiskService service;

    @Test @DisplayName("contributionPct auto-calculated = marginal/total × 100")
    void contributionPctCalc() {
        RiskContribution rc = new RiskContribution();
        rc.setCalcDate(LocalDate.now()); rc.setPortfolioCode("PF-001"); rc.setRiskMeasure("VAR");
        rc.setMarginalContribution(new BigDecimal("5000000"));
        rc.setTotalPortfolioRisk(new BigDecimal("50000000"));
        rc.setStandaloneRisk(new BigDecimal("8000000"));
        when(repository.save(any())).thenAnswer(i -> { RiskContribution r = i.getArgument(0); r.setId(1L); return r; });
        RiskContribution result = service.calculate(rc);
        assertThat(result.getContributionPct()).isEqualByComparingTo("10.0000");
    }

    @Test @DisplayName("Diversification benefit = standalone - marginal")
    void diversificationBenefit() {
        RiskContribution rc = new RiskContribution();
        rc.setCalcDate(LocalDate.now()); rc.setPortfolioCode("PF-002"); rc.setRiskMeasure("EXPECTED_SHORTFALL");
        rc.setMarginalContribution(new BigDecimal("3000000"));
        rc.setTotalPortfolioRisk(new BigDecimal("30000000"));
        rc.setStandaloneRisk(new BigDecimal("5000000"));
        when(repository.save(any())).thenAnswer(i -> { RiskContribution r = i.getArgument(0); r.setId(1L); return r; });
        RiskContribution result = service.calculate(rc);
        assertThat(result.getDiversificationBenefit()).isEqualByComparingTo("2000000");
    }
}
