package com.cbs.marketresearch.repository;

import com.cbs.marketresearch.entity.MarketResearchProject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MarketResearchProjectRepository extends JpaRepository<MarketResearchProject, Long> {
    Optional<MarketResearchProject> findByProjectCode(String projectCode);
    List<MarketResearchProject> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
    List<MarketResearchProject> findByProjectTypeAndStatusOrderByCreatedAtDesc(String projectType, String status);
    List<MarketResearchProject> findByStatusOrderByCreatedAtDesc(String status);
}
