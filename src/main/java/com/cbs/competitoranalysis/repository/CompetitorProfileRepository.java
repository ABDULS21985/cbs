package com.cbs.competitoranalysis.repository;

import com.cbs.competitoranalysis.entity.CompetitorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompetitorProfileRepository extends JpaRepository<CompetitorProfile, Long> {
    Optional<CompetitorProfile> findByProfileCode(String profileCode);
    List<CompetitorProfile> findByCompetitorTypeAndStatusOrderByMarketSharePctDesc(String competitorType, String status);
    List<CompetitorProfile> findByThreatLevelOrderByMarketSharePctDesc(String threatLevel);
    boolean existsByCompetitorNameAndCountry(String competitorName, String country);
    List<CompetitorProfile> findByStatusOrderByCompetitorNameAsc(String status);
    List<CompetitorProfile> findByCountryAndStatusOrderByMarketSharePctDesc(String country, String status);
}
