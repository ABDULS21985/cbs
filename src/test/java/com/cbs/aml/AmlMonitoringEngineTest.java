package com.cbs.aml;

import com.cbs.aml.engine.AmlMonitoringEngine;
import com.cbs.aml.entity.AmlRule;
import com.cbs.aml.entity.AmlRuleCategory;
import com.cbs.customer.entity.RiskRating;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AmlMonitoringEngineTest {

    private AmlMonitoringEngine engine;
    private List<AmlRule> rules;

    @BeforeEach
    void setUp() {
        engine = new AmlMonitoringEngine();

        AmlRule largeCash = AmlRule.builder().ruleCode("LARGE-CASH-01").ruleName("Large Cash")
                .ruleCategory(AmlRuleCategory.LARGE_CASH).thresholdAmount(new BigDecimal("10000"))
                .severity("HIGH").applicableCustomerTypes("ALL").applicableChannels("ALL")
                .ruleConfig(Map.of()).isActive(true).build();

        AmlRule structuring = AmlRule.builder().ruleCode("STRUCT-01").ruleName("Structuring")
                .ruleCategory(AmlRuleCategory.STRUCTURING)
                .thresholdAmount(new BigDecimal("10000")).thresholdCount(3)
                .severity("HIGH").applicableCustomerTypes("ALL").applicableChannels("ALL")
                .ruleConfig(Map.of()).isActive(true).build();

        AmlRule pep = AmlRule.builder().ruleCode("PEP-01").ruleName("PEP Transaction")
                .ruleCategory(AmlRuleCategory.PEP).thresholdAmount(new BigDecimal("5000"))
                .severity("CRITICAL").applicableCustomerTypes("ALL").applicableChannels("ALL")
                .ruleConfig(Map.of()).isActive(true).build();

        AmlRule dormant = AmlRule.builder().ruleCode("DORM-01").ruleName("Dormant Reactivation")
                .ruleCategory(AmlRuleCategory.DORMANT_REACTIVATION)
                .severity("MEDIUM").applicableCustomerTypes("ALL").applicableChannels("ALL")
                .ruleConfig(Map.of()).isActive(true).build();

        AmlRule highRisk = AmlRule.builder().ruleCode("HRC-01").ruleName("High Risk Country")
                .ruleCategory(AmlRuleCategory.HIGH_RISK_COUNTRY)
                .severity("HIGH").applicableCustomerTypes("ALL").applicableChannels("ALL")
                .ruleConfig(Map.of("high_risk_countries", "IRN,PRK,SYR")).isActive(true).build();

        rules = List.of(largeCash, structuring, pep, dormant, highRisk);
    }

    @Test
    @DisplayName("Large cash: triggers on amount >= threshold")
    void largeCash_Triggers() {
        var ctx = AmlMonitoringEngine.TransactionContext.builder()
                .amount(new BigDecimal("15000")).currency("USD").channel("BRANCH")
                .customerRiskRating(RiskRating.LOW)
                .recentTransactionCount(1).recentTransactionTotal(new BigDecimal("15000"))
                .recentRoundAmountCount(0).daysSinceLastTransaction(5)
                .recentCreditTotal(BigDecimal.ZERO).recentDebitTotal(BigDecimal.ZERO).build();

        var triggers = engine.evaluateTransaction(ctx, rules);
        assertThat(triggers).anyMatch(t -> t.getCategory() == AmlRuleCategory.LARGE_CASH);
    }

    @Test
    @DisplayName("Large cash: no trigger below threshold")
    void largeCash_NoTrigger() {
        var ctx = AmlMonitoringEngine.TransactionContext.builder()
                .amount(new BigDecimal("5000")).currency("USD").channel("ONLINE")
                .customerRiskRating(RiskRating.LOW)
                .recentTransactionCount(1).recentTransactionTotal(new BigDecimal("5000"))
                .recentRoundAmountCount(0).daysSinceLastTransaction(5)
                .recentCreditTotal(BigDecimal.ZERO).recentDebitTotal(BigDecimal.ZERO).build();

        var triggers = engine.evaluateTransaction(ctx, rules);
        assertThat(triggers).noneMatch(t -> t.getCategory() == AmlRuleCategory.LARGE_CASH);
    }

    @Test
    @DisplayName("Structuring: triggers when multiple near-threshold transactions")
    void structuring_Triggers() {
        var ctx = AmlMonitoringEngine.TransactionContext.builder()
                .amount(new BigDecimal("9500")).currency("USD").channel("BRANCH")
                .customerRiskRating(RiskRating.LOW)
                .recentTransactionCount(4).recentTransactionTotal(new BigDecimal("38000"))
                .recentRoundAmountCount(0).daysSinceLastTransaction(1)
                .recentCreditTotal(BigDecimal.ZERO).recentDebitTotal(BigDecimal.ZERO).build();

        var triggers = engine.evaluateTransaction(ctx, rules);
        assertThat(triggers).anyMatch(t -> t.getCategory() == AmlRuleCategory.STRUCTURING);
    }

    @Test
    @DisplayName("PEP: triggers for politically exposed person above threshold")
    void pep_Triggers() {
        var ctx = AmlMonitoringEngine.TransactionContext.builder()
                .amount(new BigDecimal("7500")).currency("USD").channel("ONLINE")
                .customerRiskRating(RiskRating.PEP)
                .recentTransactionCount(1).recentTransactionTotal(new BigDecimal("7500"))
                .recentRoundAmountCount(0).daysSinceLastTransaction(10)
                .recentCreditTotal(BigDecimal.ZERO).recentDebitTotal(BigDecimal.ZERO).build();

        var triggers = engine.evaluateTransaction(ctx, rules);
        assertThat(triggers).anyMatch(t -> t.getCategory() == AmlRuleCategory.PEP);
    }

    @Test
    @DisplayName("Dormant reactivation: triggers after 180+ days inactive")
    void dormant_Triggers() {
        var ctx = AmlMonitoringEngine.TransactionContext.builder()
                .amount(new BigDecimal("5000")).currency("USD").channel("BRANCH")
                .customerRiskRating(RiskRating.LOW)
                .recentTransactionCount(1).recentTransactionTotal(new BigDecimal("5000"))
                .recentRoundAmountCount(0).daysSinceLastTransaction(200)
                .recentCreditTotal(BigDecimal.ZERO).recentDebitTotal(BigDecimal.ZERO).build();

        var triggers = engine.evaluateTransaction(ctx, rules);
        assertThat(triggers).anyMatch(t -> t.getCategory() == AmlRuleCategory.DORMANT_REACTIVATION);
    }

    @Test
    @DisplayName("High-risk country: triggers for sanctioned jurisdiction")
    void highRiskCountry_Triggers() {
        var ctx = AmlMonitoringEngine.TransactionContext.builder()
                .amount(new BigDecimal("3000")).currency("USD").channel("SWIFT")
                .customerRiskRating(RiskRating.MEDIUM).counterpartyCountry("IRN")
                .recentTransactionCount(1).recentTransactionTotal(new BigDecimal("3000"))
                .recentRoundAmountCount(0).daysSinceLastTransaction(5)
                .recentCreditTotal(BigDecimal.ZERO).recentDebitTotal(BigDecimal.ZERO).build();

        var triggers = engine.evaluateTransaction(ctx, rules);
        assertThat(triggers).anyMatch(t -> t.getCategory() == AmlRuleCategory.HIGH_RISK_COUNTRY);
    }
}
