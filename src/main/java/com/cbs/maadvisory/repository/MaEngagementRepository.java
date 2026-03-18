package com.cbs.maadvisory.repository;

import com.cbs.maadvisory.entity.MaEngagement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MaEngagementRepository extends JpaRepository<MaEngagement, Long> {
    Optional<MaEngagement> findByEngagementCode(String engagementCode);
    List<MaEngagement> findByStatusNotIn(List<String> statuses);
    List<MaEngagement> findByLeadBanker(String leadBanker);
}
