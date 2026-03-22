package com.cbs.marketresearch.repository;

import com.cbs.marketresearch.entity.MarketResearchProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MarketResearchProjectRepository extends JpaRepository<MarketResearchProject, Long> {
    List<MarketResearchProject> findByStatusOrderByCreatedAtDesc(String status);
    Optional<MarketResearchProject> findByProjectCode(String projectCode);
    List<MarketResearchProject> findByProjectTypeOrderByCreatedAtDesc(String projectType);

    @Query("SELECT COUNT(p) FROM MarketResearchProject p WHERE p.status = 'COMPLETED' AND p.completedAt >= :since")
    long countCompletedSince(Instant since);
}
