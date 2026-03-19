package com.cbs.suitability.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.suitability.entity.ClientRiskProfile;
import com.cbs.suitability.entity.SuitabilityCheck;
import com.cbs.suitability.repository.ClientRiskProfileRepository;
import com.cbs.suitability.repository.SuitabilityCheckRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.Map; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SuitabilityService {
    private final ClientRiskProfileRepository profileRepository;
    private final SuitabilityCheckRepository checkRepository;

    private static final Map<String, Integer> RISK_LEVELS = Map.of(
        "LOW_RISK", 1, "MEDIUM_RISK", 2, "HIGH_RISK", 3, "VERY_HIGH_RISK", 4, "SPECULATIVE", 5
    );
    private static final Map<String, Integer> TOLERANCE_LEVELS = Map.of(
        "CONSERVATIVE", 1, "MODERATE", 2, "BALANCED", 3, "AGGRESSIVE", 4, "VERY_AGGRESSIVE", 5
    );

    @Transactional public ClientRiskProfile createRiskProfile(ClientRiskProfile profile) {
        profile.setProfileCode("CRP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        profile.setProfileDate(LocalDate.now());
        profile.setStatus("ACTIVE");
        return profileRepository.save(profile);
    }

    @Transactional public ClientRiskProfile updateRiskProfile(String profileCode, ClientRiskProfile update) {
        ClientRiskProfile profile = getProfileByCode(profileCode);
        profile.setInvestmentObjective(update.getInvestmentObjective());
        profile.setRiskTolerance(update.getRiskTolerance());
        profile.setInvestmentHorizon(update.getInvestmentHorizon());
        profile.setAnnualIncome(update.getAnnualIncome());
        profile.setNetWorth(update.getNetWorth());
        profile.setLiquidNetWorth(update.getLiquidNetWorth());
        profile.setInvestmentExperience(update.getInvestmentExperience());
        profile.setInstrumentExperience(update.getInstrumentExperience());
        profile.setKnowledgeAssessmentScore(update.getKnowledgeAssessmentScore());
        profile.setConcentrationLimits(update.getConcentrationLimits());
        profile.setMaxSingleInvestmentPct(update.getMaxSingleInvestmentPct());
        profile.setDerivativesApproved(update.getDerivativesApproved());
        profile.setLeverageApproved(update.getLeverageApproved());
        profile.setMaxLeverageRatio(update.getMaxLeverageRatio());
        profile.setNextReviewDate(update.getNextReviewDate());
        profile.setProfileDate(LocalDate.now());
        return profileRepository.save(profile);
    }

    @Transactional public SuitabilityCheck performSuitabilityCheck(SuitabilityCheck check) {
        ClientRiskProfile profile = profileRepository.findById(check.getProfileId()).orElseThrow(() -> new ResourceNotFoundException("ClientRiskProfile", "id", check.getProfileId()));
        check.setCheckRef("SC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        check.setCustomerId(profile.getCustomerId());

        // Rule 1: Risk tolerance match
        int instrumentRisk = RISK_LEVELS.getOrDefault(check.getInstrumentRiskRating(), 3);
        int clientTolerance = TOLERANCE_LEVELS.getOrDefault(profile.getRiskTolerance(), 2);
        check.setRiskToleranceMatch(instrumentRisk <= clientTolerance);

        // Rule 2: Experience match
        boolean hasExperience = profile.getInvestmentExperience() != null && !"NONE".equals(profile.getInvestmentExperience());
        check.setExperienceMatch(hasExperience);

        // Rule 3: Concentration check
        check.setConcentrationCheck(check.getProposedPctOfPortfolio() == null || check.getProposedPctOfPortfolio().compareTo(new BigDecimal("30")) <= 0);

        // Rule 4: Liquidity check
        boolean liquidityOk = true;
        if (check.getProposedAmount() != null && profile.getLiquidNetWorth() != null && profile.getMaxSingleInvestmentPct() != null) {
            BigDecimal maxInvestment = profile.getLiquidNetWorth().multiply(profile.getMaxSingleInvestmentPct()).divide(new BigDecimal("100"), 4, java.math.RoundingMode.HALF_UP);
            liquidityOk = check.getProposedAmount().compareTo(maxInvestment) <= 0;
        }
        check.setLiquidityCheck(liquidityOk);

        // Rule 5: Knowledge check
        BigDecimal score = profile.getKnowledgeAssessmentScore();
        check.setKnowledgeCheck(score != null && score.compareTo(new BigDecimal("60")) >= 0);

        // Rule 6: Leverage check
        check.setLeverageCheck(Boolean.TRUE.equals(profile.getLeverageApproved()) || instrumentRisk <= 3);

        // Overall result
        boolean allPass = Boolean.TRUE.equals(check.getRiskToleranceMatch())
            && Boolean.TRUE.equals(check.getExperienceMatch())
            && Boolean.TRUE.equals(check.getConcentrationCheck())
            && Boolean.TRUE.equals(check.getLiquidityCheck())
            && Boolean.TRUE.equals(check.getKnowledgeCheck())
            && Boolean.TRUE.equals(check.getLeverageCheck());
        boolean criticalFail = !Boolean.TRUE.equals(check.getRiskToleranceMatch()) || !Boolean.TRUE.equals(check.getLiquidityCheck());

        if (allPass) {
            check.setOverallResult("SUITABLE");
        } else if (criticalFail) {
            check.setOverallResult("UNSUITABLE");
        } else {
            check.setOverallResult("SUITABLE_WITH_WARNING");
        }

        return checkRepository.save(check);
    }

    @Transactional public SuitabilityCheck overrideCheck(String checkRef, String justification, String approver) {
        SuitabilityCheck check = getCheckByRef(checkRef);
        check.setOverrideApplied(true);
        check.setOverrideJustification(justification);
        check.setOverrideApprovedBy(approver);
        check.setOverallResult("SUITABLE_WITH_WARNING");
        return checkRepository.save(check);
    }

    @Transactional public SuitabilityCheck acknowledgeDisclosure(String checkRef) {
        SuitabilityCheck check = getCheckByRef(checkRef);
        check.setClientAcknowledged(true);
        check.setClientAcknowledgedAt(Instant.now());
        return checkRepository.save(check);
    }

    public ClientRiskProfile getProfileByCustomer(Long customerId) {
        return profileRepository.findByCustomerIdAndStatus(customerId, "ACTIVE").orElseThrow(() -> new ResourceNotFoundException("ClientRiskProfile", "customerId", customerId));
    }

    public List<SuitabilityCheck> getCheckHistory(Long customerId) { return checkRepository.findByCustomerIdOrderByCheckedAtDesc(customerId); }

    public List<SuitabilityCheck> getOverrideReport(Instant from, Instant to) { return checkRepository.findByOverrideAppliedAndCheckedAtBetween(true, from, to); }

    public List<ClientRiskProfile> getExpiredProfiles() { return profileRepository.findByNextReviewDateBeforeAndStatus(LocalDate.now(), "ACTIVE"); }

    public ClientRiskProfile getProfileByCode(String code) { return profileRepository.findByProfileCode(code).orElseThrow(() -> new ResourceNotFoundException("ClientRiskProfile", "profileCode", code)); }

    private SuitabilityCheck getCheckByRef(String ref) { return checkRepository.findByCheckRef(ref).orElseThrow(() -> new ResourceNotFoundException("SuitabilityCheck", "checkRef", ref)); }

    public java.util.List<ClientRiskProfile> getAllProfiles() {
        return profileRepository.findAll();
    }

    public java.util.List<SuitabilityCheck> getAllChecks() {
        return checkRepository.findAll();
    }

}
