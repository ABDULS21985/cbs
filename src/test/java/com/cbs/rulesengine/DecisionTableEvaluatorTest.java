package com.cbs.rulesengine;

import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.entity.*;
import com.cbs.rulesengine.repository.BusinessRuleRepository;
import com.cbs.rulesengine.repository.DecisionTableRepository;
import com.cbs.rulesengine.repository.DecisionTableRowRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DecisionTableEvaluatorTest {

    @Mock
    private DecisionTableRepository decisionTableRepository;

    @Mock
    private DecisionTableRowRepository decisionTableRowRepository;

    @Mock
    private BusinessRuleRepository businessRuleRepository;

    @Mock
    private CurrentTenantResolver currentTenantResolver;

    private DecisionTableEvaluator evaluator;

    @BeforeEach
    void setUp() {
        evaluator = new DecisionTableEvaluator(
                decisionTableRepository,
                decisionTableRowRepository,
                businessRuleRepository,
                currentTenantResolver
        );
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(null);
    }

    @Test
    void firstMatchReturnsFirstMatchingRowOnly() {
        DecisionTable table = buildTable(1L, DecisionTableHitPolicy.FIRST_MATCH);
        List<DecisionTableRow> rows = List.of(
                buildRow(table, 11L, 1, "RETAIL", 0, 1_000_000, 12, 60, 5.5, 2500),
                buildRow(table, 12L, 2, "*", 0, 1_000_000, 1, 120, 6.5, 3000)
        );

        when(decisionTableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(1L)).thenReturn(rows);

        DecisionResultResponse result = evaluator.evaluate(1L, Map.of(
                "customerSegment", "RETAIL",
                "financingAmount", 100_000,
                "tenorMonths", 24
        ));

        assertThat(result.getMatched()).isTrue();
        assertThat(result.getMatchedRowIds()).containsExactly(11L, 12L);
        assertThat(result.getOutputs()).containsEntry("profitRate", 5.5).containsEntry("processingFee", 2500);
    }

    @Test
    void allMatchesReturnsAllMatchingRows() {
        DecisionTable table = buildTable(1L, DecisionTableHitPolicy.ALL_MATCHES);
        List<DecisionTableRow> rows = List.of(
                buildRow(table, 21L, 1, "*", 0, 2_000_000, 1, 120, 5.0, 1000),
                buildRow(table, 22L, 2, "RETAIL", 0, 2_000_000, 1, 120, 5.5, 2000)
        );

        when(decisionTableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(1L)).thenReturn(rows);

        DecisionResultResponse result = evaluator.evaluate(1L, Map.of(
                "customerSegment", "RETAIL",
                "financingAmount", 200_000,
                "tenorMonths", 12
        ));

        assertThat(result.getMatched()).isTrue();
        assertThat(result.getMatchedRowIds()).containsExactly(21L, 22L);
        assertThat(result.getMatchedOutputs()).hasSize(2);
    }

    @Test
    void collectSumAggregatesNumericOutputs() {
        DecisionTable table = buildTable(1L, DecisionTableHitPolicy.COLLECT_SUM);
        List<DecisionTableRow> rows = List.of(
                buildRow(table, 31L, 1, "*", 0, 2_000_000, 1, 120, 1.5, 1000),
                buildRow(table, 32L, 2, "RETAIL", 0, 2_000_000, 1, 120, 2.0, 2000)
        );

        when(decisionTableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(1L)).thenReturn(rows);

        DecisionResultResponse result = evaluator.evaluate(1L, Map.of(
                "customerSegment", "RETAIL",
                "financingAmount", 200_000,
                "tenorMonths", 12
        ));

        assertThat(result.getMatched()).isTrue();
        assertThat(new BigDecimal(String.valueOf(result.getOutputs().get("profitRate"))))
                .isEqualByComparingTo("3.5");
        assertThat(new BigDecimal(String.valueOf(result.getOutputs().get("processingFee"))))
                .isEqualByComparingTo("3000");
    }

    @Test
    void rangeMatchingAndWildcardWork() {
        DecisionTable table = buildTable(1L, DecisionTableHitPolicy.FIRST_MATCH);
        List<DecisionTableRow> rows = List.of(
                buildRow(table, 41L, 1, "*", 0, 500_000, 12, 36, 4.9, 1200)
        );

        when(decisionTableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(1L)).thenReturn(rows);

        DecisionResultResponse result = evaluator.evaluate(1L, Map.of(
                "customerSegment", "SME",
                "financingAmount", 500_000,
                "tenorMonths", 36
        ));

        assertThat(result.getMatched()).isTrue();
        assertThat(result.getMatchedRowIds()).containsExactly(41L);
    }

    @Test
    void noMatchReturnsFalseAndEmptyOutputs() {
        DecisionTable table = buildTable(1L, DecisionTableHitPolicy.FIRST_MATCH);
        List<DecisionTableRow> rows = List.of(
                buildRow(table, 51L, 1, "CORPORATE", 1_000_001, 5_000_000, 12, 36, 4.8, 7500)
        );

        when(decisionTableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(1L)).thenReturn(rows);

        DecisionResultResponse result = evaluator.evaluate(1L, Map.of(
                "customerSegment", "RETAIL",
                "financingAmount", 100_000,
                "tenorMonths", 12
        ));

        assertThat(result.getMatched()).isFalse();
        assertThat(result.getMatchedRowIds()).isEmpty();
        assertThat(result.getOutputs()).isEmpty();
    }

    @Test
    void evaluateByRuleCodeResolvesActiveTable() {
        BusinessRule rule = BusinessRule.builder()
                .id(77L)
                .ruleCode("MURABAHA_PROFIT_RATE_TABLE")
                .name("Murabaha Table")
                .category(BusinessRuleCategory.PRICING)
                .ruleType(BusinessRuleType.CALCULATION)
                .severity(RuleSeverity.INFORMATIONAL)
                .effectiveFrom(LocalDate.now())
                .status(BusinessRuleStatus.ACTIVE)
                .build();
        DecisionTable table = buildTable(2L, DecisionTableHitPolicy.PRIORITY);
        table.setRule(rule);

        List<DecisionTableRow> rows = List.of(
                buildRow(table, 61L, 1, "RETAIL", 0, 500_000, 1, 36, 5.5, 2000),
                buildRow(table, 62L, 2, "*", 0, 500_000, 1, 36, 6.0, 2500)
        );

        when(businessRuleRepository.findByRuleCodeAndTenantIdIsNull("MURABAHA_PROFIT_RATE_TABLE"))
                .thenReturn(Optional.of(rule));
        when(decisionTableRepository.findByRuleIdAndStatus(77L, BusinessRuleStatus.ACTIVE))
                .thenReturn(Optional.of(table));
        when(decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(2L))
                .thenReturn(rows);

        DecisionResultResponse result = evaluator.evaluateByRuleCode("MURABAHA_PROFIT_RATE_TABLE", Map.of(
                "customerSegment", "RETAIL",
                "financingAmount", 300_000,
                "tenorMonths", 12
        ));

        assertThat(result.getMatched()).isTrue();
        assertThat(result.getMatchedRowIds()).containsExactly(61L, 62L);
        assertThat(result.getOutputs()).containsEntry("profitRate", 5.5);
    }

    private DecisionTable buildTable(Long id, DecisionTableHitPolicy hitPolicy) {
        BusinessRule rule = BusinessRule.builder()
                .id(7L)
                .ruleCode("RULE")
                .name("Rule")
                .category(BusinessRuleCategory.PRICING)
                .ruleType(BusinessRuleType.CALCULATION)
                .severity(RuleSeverity.INFORMATIONAL)
                .effectiveFrom(LocalDate.now())
                .status(BusinessRuleStatus.ACTIVE)
                .build();

        return DecisionTable.builder()
                .id(id)
                .rule(rule)
                .tableName("Murabaha Table")
                .hitPolicy(hitPolicy)
                .status(BusinessRuleStatus.ACTIVE)
                .tableVersion(1)
                .inputColumns(List.of(
                        Map.of("name", "customerSegment", "type", "STRING"),
                        Map.of("name", "financingAmount", "type", "DECIMAL_RANGE"),
                        Map.of("name", "tenorMonths", "type", "INTEGER_RANGE")
                ))
                .outputColumns(List.of(
                        Map.of("name", "profitRate", "type", "DECIMAL"),
                        Map.of("name", "processingFee", "type", "DECIMAL")
                ))
                .build();
    }

    private DecisionTableRow buildRow(DecisionTable table, Long rowId, int rowNumber, String segment,
                                      int amountFrom, int amountTo, int tenorFrom, int tenorTo,
                                      double profitRate, int processingFee) {
        return DecisionTableRow.builder()
                .id(rowId)
                .decisionTable(table)
                .rowNumber(rowNumber)
                .inputValues(List.of(
                        Map.of("value", segment),
                        Map.of("from", amountFrom, "to", amountTo),
                        Map.of("from", tenorFrom, "to", tenorTo)
                ))
                .outputValues(List.of(
                        Map.of("value", profitRate),
                        Map.of("value", processingFee)
                ))
                .isActive(true)
                .priority(rowNumber)
                .build();
    }
}
