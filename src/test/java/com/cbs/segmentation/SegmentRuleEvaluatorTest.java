package com.cbs.segmentation;

import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import com.cbs.segmentation.engine.SegmentRuleEvaluator;
import com.cbs.segmentation.entity.RuleOperator;
import com.cbs.segmentation.entity.Segment;
import com.cbs.segmentation.entity.SegmentRule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SegmentRuleEvaluatorTest {

    private SegmentRuleEvaluator evaluator;
    private Customer customer;
    private Segment segment;

    @BeforeEach
    void setUp() {
        evaluator = new SegmentRuleEvaluator();

        customer = Customer.builder()
                .id(1L)
                .customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE)
                .riskRating(RiskRating.LOW)
                .firstName("Amina")
                .lastName("Bakare")
                .dateOfBirth(LocalDate.of(1990, 3, 15))
                .nationality("NGA")
                .stateOfOrigin("Lagos")
                .branchCode("ABJ001")
                .email("amina@example.com")
                .build();

        segment = Segment.builder().id(1L).code("TEST").build();
    }

    @Test
    @DisplayName("EQUALS operator matches customer type")
    void equals_matches() {
        List<SegmentRule> rules = List.of(
                makeRule("customerType", RuleOperator.EQUALS, "INDIVIDUAL", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("EQUALS operator rejects non-matching value")
    void equals_rejects() {
        List<SegmentRule> rules = List.of(
                makeRule("customerType", RuleOperator.EQUALS, "CORPORATE", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isFalse();
    }

    @Test
    @DisplayName("IN operator matches value in list")
    void in_matches() {
        List<SegmentRule> rules = List.of(
                makeRule("nationality", RuleOperator.IN, "NGA,GHA,KEN", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("NOT_IN operator rejects value in list")
    void notIn_rejects() {
        List<SegmentRule> rules = List.of(
                makeRule("nationality", RuleOperator.NOT_IN, "NGA,GHA", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isFalse();
    }

    @Test
    @DisplayName("CONTAINS operator matches substring")
    void contains_matches() {
        List<SegmentRule> rules = List.of(
                makeRule("email", RuleOperator.CONTAINS, "example.com", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("Computed field 'age' with LESS_THAN operator")
    void age_lessThan() {
        // Customer born in 1990, so age ~35-36 in 2026
        List<SegmentRule> rules = List.of(
                makeRule("age", RuleOperator.LESS_THAN, "30", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isFalse();
    }

    @Test
    @DisplayName("BETWEEN operator for age range")
    void age_between() {
        List<SegmentRule> rules = List.of(
                makeRule("age", RuleOperator.BETWEEN, "30", "40", 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("AND logic within same group: both rules must match")
    void andLogic_sameGroup() {
        List<SegmentRule> rules = List.of(
                makeRule("customerType", RuleOperator.EQUALS, "INDIVIDUAL", null, 0),
                makeRule("nationality", RuleOperator.EQUALS, "NGA", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("AND logic: one failing rule in group causes group to fail")
    void andLogic_oneFails() {
        List<SegmentRule> rules = List.of(
                makeRule("customerType", RuleOperator.EQUALS, "INDIVIDUAL", null, 0),
                makeRule("nationality", RuleOperator.EQUALS, "GHA", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isFalse();
    }

    @Test
    @DisplayName("OR logic across groups: one matching group is enough")
    void orLogic_acrossGroups() {
        List<SegmentRule> rules = List.of(
                // Group 0: will fail (wrong nationality)
                makeRule("nationality", RuleOperator.EQUALS, "GHA", null, 0),
                // Group 1: will pass
                makeRule("customerType", RuleOperator.EQUALS, "INDIVIDUAL", null, 1)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("IS_NULL operator for empty field")
    void isNull_emptyField() {
        customer.setIndustryCode(null);
        List<SegmentRule> rules = List.of(
                makeRule("industryCode", RuleOperator.IS_NULL, "unused", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("IS_NOT_NULL operator for populated field")
    void isNotNull_populatedField() {
        List<SegmentRule> rules = List.of(
                makeRule("email", RuleOperator.IS_NOT_NULL, "unused", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("STARTS_WITH operator")
    void startsWith() {
        List<SegmentRule> rules = List.of(
                makeRule("branchCode", RuleOperator.STARTS_WITH, "ABJ", null, 0)
        );
        assertThat(evaluator.evaluate(customer, rules)).isTrue();
    }

    @Test
    @DisplayName("Empty rules returns false")
    void emptyRules_returnsFalse() {
        assertThat(evaluator.evaluate(customer, List.of())).isFalse();
    }

    @Test
    @DisplayName("Inactive rules are skipped")
    void inactiveRules_skipped() {
        SegmentRule rule = makeRule("customerType", RuleOperator.EQUALS, "INDIVIDUAL", null, 0);
        rule.setIsActive(false);
        assertThat(evaluator.evaluate(customer, List.of(rule))).isFalse();
    }

    private SegmentRule makeRule(String field, RuleOperator op, String value, String valueTo, int group) {
        return SegmentRule.builder()
                .segment(segment)
                .fieldName(field)
                .operator(op)
                .fieldValue(value)
                .fieldValueTo(valueTo)
                .logicalGroup(group)
                .isActive(true)
                .build();
    }
}
