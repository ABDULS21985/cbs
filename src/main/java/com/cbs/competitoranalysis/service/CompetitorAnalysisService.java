package com.cbs.competitoranalysis.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.competitoranalysis.entity.CompetitorProfile;
import com.cbs.competitoranalysis.repository.CompetitorProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CompetitorAnalysisService {

    private final CompetitorProfileRepository repository;
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_THREAT_LEVELS = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private static final Set<String> VALID_COMPETITOR_TYPES = Set.of(
            "COMMERCIAL_BANK", "MICROFINANCE", "FINTECH", "MOBILE_MONEY", "INVESTMENT_BANK", "DIGITAL_BANK"
    );

    @Transactional
    public CompetitorProfile create(CompetitorProfile profile) {
        validateProfileFields(profile);

        if (repository.existsByCompetitorNameAndCountry(profile.getCompetitorName(), profile.getCountry())) {
            throw new BusinessException(
                    "A competitor profile for '" + profile.getCompetitorName() + "' in '"
                            + profile.getCountry() + "' already exists.",
                    "DUPLICATE_COMPETITOR"
            );
        }

        profile.setProfileCode("CMP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (profile.getStatus() == null) {
            profile.setStatus("ACTIVE");
        }
        if (profile.getThreatLevel() == null) {
            profile.setThreatLevel("MEDIUM");
        }
        profile.setLastUpdatedDate(LocalDate.now());

        CompetitorProfile saved = repository.save(profile);
        log.info("Competitor profile created: code={}, name={}, by={}",
                saved.getProfileCode(), saved.getCompetitorName(), currentActorProvider.getCurrentActor());

        // Alert on HIGH/CRITICAL threat level
        if ("HIGH".equals(saved.getThreatLevel()) || "CRITICAL".equals(saved.getThreatLevel())) {
            log.warn("High-threat competitor registered: name={}, threatLevel={}, marketShare={}%",
                    saved.getCompetitorName(), saved.getThreatLevel(), saved.getMarketSharePct());
        }

        return saved;
    }

    @Transactional
    public CompetitorProfile update(String profileCode, CompetitorProfile updated) {
        CompetitorProfile existing = getByCode(profileCode);

        String previousThreatLevel = existing.getThreatLevel();

        if (updated.getCompetitorName() != null) existing.setCompetitorName(updated.getCompetitorName());
        if (updated.getCompetitorType() != null) existing.setCompetitorType(updated.getCompetitorType());
        if (updated.getTotalAssets() != null) existing.setTotalAssets(updated.getTotalAssets());
        if (updated.getTotalDeposits() != null) existing.setTotalDeposits(updated.getTotalDeposits());
        if (updated.getTotalLoans() != null) existing.setTotalLoans(updated.getTotalLoans());
        if (updated.getBranchCount() != null) existing.setBranchCount(updated.getBranchCount());
        if (updated.getCustomerCount() != null) existing.setCustomerCount(updated.getCustomerCount());
        if (updated.getMarketSharePct() != null) existing.setMarketSharePct(updated.getMarketSharePct());
        if (updated.getKeyProducts() != null) existing.setKeyProducts(updated.getKeyProducts());
        if (updated.getPricingIntelligence() != null) existing.setPricingIntelligence(updated.getPricingIntelligence());
        if (updated.getDigitalCapabilities() != null) existing.setDigitalCapabilities(updated.getDigitalCapabilities());
        if (updated.getStrengths() != null) existing.setStrengths(updated.getStrengths());
        if (updated.getWeaknesses() != null) existing.setWeaknesses(updated.getWeaknesses());
        if (updated.getThreatLevel() != null) {
            if (!VALID_THREAT_LEVELS.contains(updated.getThreatLevel())) {
                throw new BusinessException("Invalid threat level: " + updated.getThreatLevel(), "INVALID_THREAT_LEVEL");
            }
            existing.setThreatLevel(updated.getThreatLevel());
        }
        if (updated.getStrategicResponse() != null) existing.setStrategicResponse(updated.getStrategicResponse());
        if (updated.getStatus() != null) existing.setStatus(updated.getStatus());
        existing.setLastUpdatedDate(LocalDate.now());

        CompetitorProfile saved = repository.save(existing);

        // Alert on threat level escalation
        if (previousThreatLevel != null && saved.getThreatLevel() != null
                && !previousThreatLevel.equals(saved.getThreatLevel())) {
            int oldLevel = threatLevelOrdinal(previousThreatLevel);
            int newLevel = threatLevelOrdinal(saved.getThreatLevel());
            if (newLevel > oldLevel) {
                log.warn("Threat level ESCALATED for competitor {}: {} -> {}",
                        saved.getCompetitorName(), previousThreatLevel, saved.getThreatLevel());
            }
        }

        log.info("Competitor profile updated: code={}, by={}", profileCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<CompetitorProfile> getByType(String competitorType) {
        if (competitorType == null || competitorType.isBlank()) {
            throw new BusinessException("Competitor type is required.", "INVALID_TYPE");
        }
        return repository.findByCompetitorTypeAndStatusOrderByMarketSharePctDesc(competitorType, "ACTIVE");
    }

    public List<CompetitorProfile> getThreats(String threatLevel) {
        if (threatLevel == null || !VALID_THREAT_LEVELS.contains(threatLevel)) {
            throw new BusinessException("Invalid threat level: " + threatLevel, "INVALID_THREAT_LEVEL");
        }
        return repository.findByThreatLevelOrderByMarketSharePctDesc(threatLevel);
    }

    public List<CompetitorProfile> getAll() {
        return repository.findByStatusOrderByCompetitorNameAsc("ACTIVE");
    }

    /**
     * Returns a comparative analysis across active competitors for a given country.
     */
    public Map<String, Object> getComparativeAnalysis(String country) {
        if (country == null || country.isBlank()) {
            country = "NGA";
        }
        List<CompetitorProfile> competitors = repository.findByCountryAndStatusOrderByMarketSharePctDesc(country, "ACTIVE");

        if (competitors.isEmpty()) {
            return Map.of("country", country, "totalCompetitors", 0);
        }

        BigDecimal totalMarketShare = competitors.stream()
                .map(c -> c.getMarketSharePct() != null ? c.getMarketSharePct() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgAssets = competitors.stream()
                .filter(c -> c.getTotalAssets() != null)
                .map(CompetitorProfile::getTotalAssets)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(Math.max(1, competitors.stream().filter(c -> c.getTotalAssets() != null).count())), MathContext.DECIMAL64);

        Map<String, Long> byType = competitors.stream()
                .collect(Collectors.groupingBy(CompetitorProfile::getCompetitorType, Collectors.counting()));

        Map<String, Long> byThreat = competitors.stream()
                .filter(c -> c.getThreatLevel() != null)
                .collect(Collectors.groupingBy(CompetitorProfile::getThreatLevel, Collectors.counting()));

        String topCompetitor = competitors.isEmpty() ? "N/A" : competitors.get(0).getCompetitorName();

        return Map.of(
                "country", country,
                "totalCompetitors", competitors.size(),
                "totalMarketSharePct", totalMarketShare,
                "averageAssets", avgAssets,
                "distributionByType", byType,
                "distributionByThreat", byThreat,
                "topCompetitor", topCompetitor
        );
    }

    /**
     * Builds a SWOT summary for a specific competitor.
     */
    public Map<String, Object> getSwotAnalysis(String profileCode) {
        CompetitorProfile profile = getByCode(profileCode);

        Map<String, Object> swot = new LinkedHashMap<>();
        swot.put("competitorName", profile.getCompetitorName());
        swot.put("profileCode", profile.getProfileCode());
        swot.put("strengths", profile.getStrengths() != null ? profile.getStrengths() : Map.of());
        swot.put("weaknesses", profile.getWeaknesses() != null ? profile.getWeaknesses() : Map.of());

        // Derive opportunities and threats from available data
        Map<String, Object> opportunities = new LinkedHashMap<>();
        if (profile.getDigitalCapabilities() != null) {
            Object maturity = profile.getDigitalCapabilities().get("maturityLevel");
            if ("LOW".equals(maturity) || "NASCENT".equals(maturity)) {
                opportunities.put("digitalGap", "Competitor has low digital maturity - opportunity for digital differentiation");
            }
        }
        if (profile.getMarketSharePct() != null && profile.getMarketSharePct().compareTo(new BigDecimal("5")) < 0) {
            opportunities.put("marketPosition", "Small market share indicates potential to capture their customer base");
        }
        swot.put("opportunities", opportunities);

        Map<String, Object> threats = new LinkedHashMap<>();
        if (profile.getMarketSharePct() != null && profile.getMarketSharePct().compareTo(new BigDecimal("20")) > 0) {
            threats.put("marketDominance", "Competitor holds significant market share above 20%");
        }
        if ("HIGH".equals(profile.getThreatLevel()) || "CRITICAL".equals(profile.getThreatLevel())) {
            threats.put("threatLevel", "Competitor classified as " + profile.getThreatLevel() + " threat");
        }
        swot.put("threats", threats);

        return swot;
    }

    /**
     * Tracks market share changes - returns competitors whose share increased in the last update.
     */
    public List<CompetitorProfile> getMarketShareLeaders(String country) {
        if (country == null || country.isBlank()) {
            country = "NGA";
        }
        return repository.findByCountryAndStatusOrderByMarketSharePctDesc(country, "ACTIVE")
                .stream()
                .filter(c -> c.getMarketSharePct() != null)
                .limit(10)
                .collect(Collectors.toList());
    }

    private CompetitorProfile getByCode(String code) {
        return repository.findByProfileCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CompetitorProfile", "profileCode", code));
    }

    private void validateProfileFields(CompetitorProfile profile) {
        if (profile.getCompetitorName() == null || profile.getCompetitorName().isBlank()) {
            throw new BusinessException("Competitor name is required.", "INVALID_NAME");
        }
        if (profile.getCompetitorName().length() > 200) {
            throw new BusinessException("Competitor name must not exceed 200 characters.", "NAME_TOO_LONG");
        }
        if (profile.getCompetitorType() == null || profile.getCompetitorType().isBlank()) {
            throw new BusinessException("Competitor type is required.", "INVALID_TYPE");
        }
        if (!VALID_COMPETITOR_TYPES.contains(profile.getCompetitorType())) {
            throw new BusinessException(
                    "Invalid competitor type: " + profile.getCompetitorType() + ". Valid: " + VALID_COMPETITOR_TYPES,
                    "INVALID_TYPE"
            );
        }
        if (profile.getMarketSharePct() != null) {
            if (profile.getMarketSharePct().compareTo(BigDecimal.ZERO) < 0
                    || profile.getMarketSharePct().compareTo(new BigDecimal("100")) > 0) {
                throw new BusinessException("Market share percentage must be between 0 and 100.", "INVALID_MARKET_SHARE");
            }
        }
    }

    private int threatLevelOrdinal(String level) {
        return switch (level) {
            case "LOW" -> 1;
            case "MEDIUM" -> 2;
            case "HIGH" -> 3;
            case "CRITICAL" -> 4;
            default -> 0;
        };
    }
}
