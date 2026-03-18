package com.cbs.contributionrisk.repository;

import com.cbs.contributionrisk.entity.BusinessContribution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BusinessContributionRepository extends JpaRepository<BusinessContribution, Long> {
    Optional<BusinessContribution> findByReportCode(String reportCode);
    List<BusinessContribution> findByPeriodDateAndPeriodType(LocalDate periodDate, String periodType);
    List<BusinessContribution> findByBusinessUnit(String businessUnit);
    List<BusinessContribution> findByProductFamily(String productFamily);
    List<BusinessContribution> findByRegion(String region);
}
