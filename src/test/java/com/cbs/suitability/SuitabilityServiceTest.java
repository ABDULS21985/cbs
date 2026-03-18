package com.cbs.suitability;
import com.cbs.suitability.entity.ClientRiskProfile;
import com.cbs.suitability.entity.SuitabilityCheck;
import com.cbs.suitability.repository.ClientRiskProfileRepository;
import com.cbs.suitability.repository.SuitabilityCheckRepository;
import com.cbs.suitability.service.SuitabilityService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuitabilityServiceTest {
    @Mock private ClientRiskProfileRepository profileRepository;
    @Mock private SuitabilityCheckRepository checkRepository;
    @InjectMocks private SuitabilityService service;

    private ClientRiskProfile buildProfile(String tolerance, String experience, BigDecimal knowledgeScore, boolean leverageApproved) {
        ClientRiskProfile p = new ClientRiskProfile();
        p.setId(1L); p.setCustomerId(100L); p.setRiskTolerance(tolerance);
        p.setInvestmentExperience(experience); p.setKnowledgeAssessmentScore(knowledgeScore);
        p.setLeverageApproved(leverageApproved);
        p.setLiquidNetWorth(new BigDecimal("1000000")); p.setMaxSingleInvestmentPct(new BigDecimal("25"));
        return p;
    }

    private SuitabilityCheck buildCheck(Long profileId, String riskRating, BigDecimal amount) {
        SuitabilityCheck c = new SuitabilityCheck();
        c.setProfileId(profileId); c.setCheckType("PRE_TRADE");
        c.setInstrumentType("BOND"); c.setInstrumentRiskRating(riskRating);
        c.setProposedAmount(amount); c.setProposedPctOfPortfolio(new BigDecimal("10"));
        return c;
    }

    @Test @DisplayName("All rules pass yields SUITABLE")
    void allRulesPassSuitable() {
        ClientRiskProfile profile = buildProfile("AGGRESSIVE", "EXTENSIVE", new BigDecimal("85"), true);
        SuitabilityCheck check = buildCheck(1L, "MEDIUM_RISK", new BigDecimal("200000"));
        when(profileRepository.findById(1L)).thenReturn(Optional.of(profile));
        when(checkRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        SuitabilityCheck result = service.performSuitabilityCheck(check);

        assertThat(result.getOverallResult()).isEqualTo("SUITABLE");
        assertThat(result.getRiskToleranceMatch()).isTrue();
        assertThat(result.getExperienceMatch()).isTrue();
        assertThat(result.getKnowledgeCheck()).isTrue();
    }

    @Test @DisplayName("Risk tolerance mismatch yields UNSUITABLE")
    void riskToleranceMismatchUnsuitable() {
        ClientRiskProfile profile = buildProfile("CONSERVATIVE", "EXTENSIVE", new BigDecimal("85"), true);
        SuitabilityCheck check = buildCheck(1L, "VERY_HIGH_RISK", new BigDecimal("200000"));
        when(profileRepository.findById(1L)).thenReturn(Optional.of(profile));
        when(checkRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        SuitabilityCheck result = service.performSuitabilityCheck(check);

        assertThat(result.getOverallResult()).isEqualTo("UNSUITABLE");
        assertThat(result.getRiskToleranceMatch()).isFalse();
    }

    @Test @DisplayName("Knowledge score below 60 fails knowledge check")
    void lowKnowledgeScoreFails() {
        ClientRiskProfile profile = buildProfile("AGGRESSIVE", "EXTENSIVE", new BigDecimal("50"), true);
        SuitabilityCheck check = buildCheck(1L, "MEDIUM_RISK", new BigDecimal("200000"));
        when(profileRepository.findById(1L)).thenReturn(Optional.of(profile));
        when(checkRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        SuitabilityCheck result = service.performSuitabilityCheck(check);

        assertThat(result.getKnowledgeCheck()).isFalse();
        // Knowledge fail is non-critical, so SUITABLE_WITH_WARNING
        assertThat(result.getOverallResult()).isEqualTo("SUITABLE_WITH_WARNING");
    }

    @Test @DisplayName("Override sets SUITABLE_WITH_WARNING with justification")
    void overrideSetsWarning() {
        SuitabilityCheck check = new SuitabilityCheck();
        check.setId(1L); check.setCheckRef("SC-TEST"); check.setOverallResult("UNSUITABLE");
        when(checkRepository.findByCheckRef("SC-TEST")).thenReturn(Optional.of(check));
        when(checkRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        SuitabilityCheck result = service.overrideCheck("SC-TEST", "Client insists, senior approval obtained", "ADMIN-001");

        assertThat(result.getOverallResult()).isEqualTo("SUITABLE_WITH_WARNING");
        assertThat(result.getOverrideApplied()).isTrue();
        assertThat(result.getOverrideApprovedBy()).isEqualTo("ADMIN-001");
    }
}
