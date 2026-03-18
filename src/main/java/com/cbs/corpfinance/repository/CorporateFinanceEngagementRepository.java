package com.cbs.corpfinance.repository;

import com.cbs.corpfinance.entity.CorporateFinanceEngagement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CorporateFinanceEngagementRepository extends JpaRepository<CorporateFinanceEngagement, Long> {
    Optional<CorporateFinanceEngagement> findByEngagementCode(String engagementCode);
    List<CorporateFinanceEngagement> findByStatusNotIn(List<String> statuses);
    List<CorporateFinanceEngagement> findByLeadBanker(String leadBanker);
}
