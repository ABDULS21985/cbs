package com.cbs.taxadvisory.repository;

import com.cbs.taxadvisory.entity.TaxAdvisoryEngagement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaxAdvisoryEngagementRepository extends JpaRepository<TaxAdvisoryEngagement, Long> {
    Optional<TaxAdvisoryEngagement> findByEngagementCode(String engagementCode);
    List<TaxAdvisoryEngagement> findByStatusIn(List<String> statuses);
}
