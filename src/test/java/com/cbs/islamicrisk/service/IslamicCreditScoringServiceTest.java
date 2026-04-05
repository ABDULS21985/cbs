package com.cbs.islamicrisk.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.entity.IslamicCreditScoreModel;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicCreditAssessmentRepository;
import com.cbs.islamicrisk.repository.IslamicCreditScoreModelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicCreditScoringServiceTest {

    @Mock private IslamicCreditScoreModelRepository modelRepository;
    @Mock private IslamicCreditAssessmentRepository assessmentRepository;
    @Mock private IslamicRiskSupport riskSupport;

    @InjectMocks
    private IslamicCreditScoringService service;

    @BeforeEach
    void setUp() {
        lenient().when(riskSupport.uppercase(anyString())).thenAnswer(invocation -> {
            String value = invocation.getArgument(0, String.class);
            return value == null ? null : value.toUpperCase();
        });
        lenient().when(riskSupport.asBigDecimal(any())).thenAnswer(invocation ->
                toBigDecimal(invocation.getArgument(0)));
        lenient().when(riskSupport.asInteger(any())).thenAnswer(invocation ->
                toInteger(invocation.getArgument(0)));
        lenient().when(riskSupport.extractValue(any(), anyString())).thenAnswer(invocation -> {
            Map<?, ?> inputData = invocation.getArgument(0, Map.class);
            String key = invocation.getArgument(1, String.class);
            return inputData == null ? null : inputData.get(key);
        });
        lenient().when(riskSupport.scaleMoney(any())).thenAnswer(invocation -> {
            BigDecimal value = toBigDecimal(invocation.getArgument(0));
            return value.setScale(2, RoundingMode.HALF_UP);
        });
        lenient().when(riskSupport.nextRef(anyString())).thenReturn("ICR-ASS-2026-000001");
        lenient().when(riskSupport.currentActor()).thenReturn("risk.user");
        lenient().when(riskSupport.currentTenantId()).thenReturn(1L);
        lenient().when(assessmentRepository.save(any(IslamicCreditAssessment.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void assessCredit_calculatesExpectedScoreBandAndRecommendation() {
        when(modelRepository.findFirstByContractTypeCodeAndStatusOrderByModelVersionDesc(
                "MURABAHA", IslamicRiskDomainEnums.ModelStatus.ACTIVE)).thenReturn(Optional.of(baseModel()));

        IslamicRiskRequests.CreditAssessmentRequest request = IslamicRiskRequests.CreditAssessmentRequest.builder()
                .customerId(10L)
                .contractTypeCode("murabaha")
                .productCode("MRB-HOME")
                .inputData(new LinkedHashMap<>(Map.of(
                        "monthlyIncome", new BigDecimal("10000"),
                        "dsr", new BigDecimal("40")
                )))
                .requestedAmount(new BigDecimal("50000"))
                .requestedTenorMonths(120)
                .build();

        IslamicCreditAssessment result = service.assessCredit(request);

        assertThat(result.getTotalScore()).isEqualTo(80);
        assertThat(result.getScoreBand()).isEqualTo("A");
        assertThat(result.getApprovalRecommendation()).isEqualTo(IslamicRiskDomainEnums.ApprovalRecommendation.AUTO_APPROVE);
        assertThat(result.getEstimatedPd()).isEqualByComparingTo("0.010000");
        assertThat(result.getMaxApprovedAmount()).isEqualByComparingTo("50000.00");
    }

    @Test
    void assessCredit_rejectsModelWhenWeightsDoNotSumToHundred() {
        IslamicCreditScoreModel invalidModel = baseModel();
        invalidModel.setScoreComponents(List.of(
                component("INCOME_STABILITY", "monthlyIncome", 60, List.of(tier(0, 100000, 100))),
                component("DSR_RATIO", "dsr", 30, List.of(tier(0, 100, 100)))
        ));
        when(modelRepository.findFirstByContractTypeCodeAndStatusOrderByModelVersionDesc(
                "MURABAHA", IslamicRiskDomainEnums.ModelStatus.ACTIVE)).thenReturn(Optional.of(invalidModel));

        IslamicRiskRequests.CreditAssessmentRequest request = IslamicRiskRequests.CreditAssessmentRequest.builder()
                .customerId(11L)
                .contractTypeCode("MURABAHA")
                .productCode("MRB-HOME")
                .build();

        assertThatThrownBy(() -> service.assessCredit(request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("INVALID_SCORE_MODEL_WEIGHTS");
    }

    @Test
    void overrideScore_recordsOriginalAndOverriddenValues() {
        IslamicCreditAssessment assessment = IslamicCreditAssessment.builder()
                .id(55L)
                .modelId(1L)
                .totalScore(80)
                .scoreBand("A")
                .scoreBandLabel("Excellent")
                .status(IslamicRiskDomainEnums.AssessmentStatus.COMPLETED)
                .build();
        when(assessmentRepository.findById(55L)).thenReturn(Optional.of(assessment));
        when(modelRepository.findById(1L)).thenReturn(Optional.of(baseModel()));
        when(assessmentRepository.save(any(IslamicCreditAssessment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        IslamicCreditAssessment overridden = service.overrideScore(55L, IslamicRiskRequests.ScoreOverrideRequest.builder()
                .overriddenScore(40)
                .overrideReason("Manual downgrade after deeper review")
                .overrideApprovedBy("chief.risk")
                .overriddenBy("risk.manager")
                .build());

        assertThat(overridden.getOverriddenScore()).isEqualTo(40);
        assertThat(overridden.getOverriddenBy()).isEqualTo("risk.manager");
        assertThat(overridden.getScoreBand()).isEqualTo("B");
        assertThat(overridden.getStatus()).isEqualTo(IslamicRiskDomainEnums.AssessmentStatus.OVERRIDDEN);
    }

    private IslamicCreditScoreModel baseModel() {
        return IslamicCreditScoreModel.builder()
                .id(1L)
                .modelCode("ICSM-MRB-HOME-001")
                .contractTypeCode("MURABAHA")
                .modelVersion(1)
                .maximumScore(100)
                .status(IslamicRiskDomainEnums.ModelStatus.ACTIVE)
                .scoreComponents(List.of(
                        component("INCOME_STABILITY", "monthlyIncome", 60, List.of(
                                tier(0, 4999, 50),
                                tier(5000, 100000, 100)
                        )),
                        component("DSR_RATIO", "dsr", 40, List.of(
                                tier(0, 30, 100),
                                tier(30.01, 100, 50)
                        ))
                ))
                .scoreBands(List.of(
                        band("A", 80, 100, "0.01-0.50%", "AUTO_APPROVE", 5.0),
                        band("B", 0, 79, "5.01-10.00%", "DECLINE", 2.0)
                ))
                .build();
    }

    private Map<String, Object> component(String code,
                                          String dataSource,
                                          double weight,
                                          List<Map<String, Object>> tiers) {
        return new LinkedHashMap<>(Map.of(
                "componentCode", code,
                "name", code,
                "weight", BigDecimal.valueOf(weight),
                "dataSource", dataSource,
                "scoringTiers", tiers
        ));
    }

    private Map<String, Object> tier(double min, double max, int score) {
        Map<String, Object> tier = new LinkedHashMap<>();
        tier.put("min", BigDecimal.valueOf(min));
        tier.put("max", BigDecimal.valueOf(max));
        tier.put("score", BigDecimal.valueOf(score));
        return tier;
    }

    private Map<String, Object> band(String band,
                                     int minScore,
                                     int maxScore,
                                     String pdRange,
                                     String approvalAction,
                                     double maxFinancingMultiple) {
        return new LinkedHashMap<>(Map.of(
                "band", band,
                "label", band,
                "minScore", minScore,
                "maxScore", maxScore,
                "pdRange", pdRange,
                "approvalAction", approvalAction,
                "maxFinancingMultiple", BigDecimal.valueOf(maxFinancingMultiple)
        ));
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(String.valueOf(value).replace("%", ""));
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
