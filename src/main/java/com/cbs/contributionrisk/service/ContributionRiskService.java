package com.cbs.contributionrisk.service;
import com.cbs.contributionrisk.entity.RiskContribution;
import com.cbs.contributionrisk.repository.RiskContributionRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.LocalDate; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ContributionRiskService {
    private final RiskContributionRepository repository;
    @Transactional public RiskContribution calculate(RiskContribution rc) {
        rc.setContributionCode("RC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (rc.getMarginalContribution() != null && rc.getTotalPortfolioRisk() != null && rc.getTotalPortfolioRisk().compareTo(BigDecimal.ZERO) > 0)
            rc.setContributionPct(rc.getMarginalContribution().divide(rc.getTotalPortfolioRisk(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        if (rc.getStandaloneRisk() != null && rc.getMarginalContribution() != null)
            rc.setDiversificationBenefit(rc.getStandaloneRisk().subtract(rc.getMarginalContribution()));
        return repository.save(rc);
    }
    public List<RiskContribution> getByPortfolio(String portfolioCode, LocalDate date) { return repository.findByPortfolioCodeAndCalcDateOrderByContributionPctDesc(portfolioCode, date); }
    public List<RiskContribution> getByBusinessUnit(String bu, LocalDate date) { return repository.findByBusinessUnitAndCalcDateOrderByMarginalContributionDesc(bu, date); }
}
