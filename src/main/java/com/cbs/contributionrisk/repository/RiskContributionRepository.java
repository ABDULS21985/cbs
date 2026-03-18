package com.cbs.contributionrisk.repository;
import com.cbs.contributionrisk.entity.RiskContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List; import java.util.Optional;
public interface RiskContributionRepository extends JpaRepository<RiskContribution, Long> {
    Optional<RiskContribution> findByContributionCode(String code);
    List<RiskContribution> findByPortfolioCodeAndCalcDateOrderByContributionPctDesc(String portfolioCode, LocalDate date);
    List<RiskContribution> findByBusinessUnitAndCalcDateOrderByMarginalContributionDesc(String bu, LocalDate date);
}
