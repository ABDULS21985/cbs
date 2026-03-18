package com.cbs.competitoranalysis.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.competitoranalysis.entity.CompetitorProfile;
import com.cbs.competitoranalysis.repository.CompetitorProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CompetitorAnalysisService {

    private final CompetitorProfileRepository repository;

    @Transactional
    public CompetitorProfile create(CompetitorProfile profile) {
        profile.setProfileCode("CMP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return repository.save(profile);
    }

    @Transactional
    public CompetitorProfile update(String profileCode, CompetitorProfile updated) {
        CompetitorProfile existing = getByCode(profileCode);
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
        if (updated.getThreatLevel() != null) existing.setThreatLevel(updated.getThreatLevel());
        if (updated.getStrategicResponse() != null) existing.setStrategicResponse(updated.getStrategicResponse());
        if (updated.getStatus() != null) existing.setStatus(updated.getStatus());
        existing.setLastUpdatedDate(LocalDate.now());
        return repository.save(existing);
    }

    public List<CompetitorProfile> getByType(String competitorType) {
        return repository.findByCompetitorTypeAndStatusOrderByMarketSharePctDesc(competitorType, "ACTIVE");
    }

    public List<CompetitorProfile> getThreats(String threatLevel) {
        return repository.findByThreatLevelOrderByMarketSharePctDesc(threatLevel);
    }

    private CompetitorProfile getByCode(String code) {
        return repository.findByProfileCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CompetitorProfile", "profileCode", code));
    }
}
