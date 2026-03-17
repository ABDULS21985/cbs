package com.cbs.aml.engine;

import com.cbs.aml.entity.AmlRule;
import com.cbs.aml.entity.AmlRuleCategory;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.RiskRating;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * AML/CFT transaction monitoring engine.
 * Evaluates transactions against configurable rules and generates alerts.
 */
@Component
@Slf4j
public class AmlMonitoringEngine {

    public List<AlertTrigger> evaluateTransaction(TransactionContext ctx, List<AmlRule> activeRules) {
        List<AlertTrigger> triggers = new ArrayList<>();

        for (AmlRule rule : activeRules) {
            if (!isApplicable(rule, ctx)) continue;

            AlertTrigger trigger = switch (rule.getRuleCategory()) {
                case LARGE_CASH -> evaluateLargeCash(rule, ctx);
                case STRUCTURING -> evaluateStructuring(rule, ctx);
                case VELOCITY -> evaluateVelocity(rule, ctx);
                case ROUND_AMOUNT -> evaluateRoundAmount(rule, ctx);
                case PEP -> evaluatePep(rule, ctx);
                case DORMANT_REACTIVATION -> evaluateDormantReactivation(rule, ctx);
                case HIGH_RISK_COUNTRY -> evaluateHighRiskCountry(rule, ctx);
                case RAPID_MOVEMENT -> evaluateRapidMovement(rule, ctx);
                default -> null;
            };

            if (trigger != null) {
                trigger.setRuleCode(rule.getRuleCode());
                trigger.setSeverity(rule.getSeverity());
                triggers.add(trigger);
            }
        }

        return triggers;
    }

    private AlertTrigger evaluateLargeCash(AmlRule rule, TransactionContext ctx) {
        if (rule.getThresholdAmount() == null) return null;
        if (ctx.amount.compareTo(rule.getThresholdAmount()) >= 0) {
            return AlertTrigger.builder()
                    .category(AmlRuleCategory.LARGE_CASH)
                    .description(String.format("Large cash transaction: %s %s exceeds threshold %s",
                            ctx.amount, ctx.currency, rule.getThresholdAmount()))
                    .triggerAmount(ctx.amount).build();
        }
        return null;
    }

    private AlertTrigger evaluateStructuring(AmlRule rule, TransactionContext ctx) {
        // Structuring: multiple transactions just below threshold within a period
        if (rule.getThresholdAmount() == null || rule.getThresholdCount() == null) return null;
        BigDecimal nearThreshold = rule.getThresholdAmount().multiply(new BigDecimal("0.90"));

        if (ctx.amount.compareTo(nearThreshold) >= 0 && ctx.amount.compareTo(rule.getThresholdAmount()) < 0) {
            if (ctx.recentTransactionCount >= rule.getThresholdCount()) {
                return AlertTrigger.builder()
                        .category(AmlRuleCategory.STRUCTURING)
                        .description(String.format("Possible structuring: %d transactions near threshold %s in period",
                                ctx.recentTransactionCount, rule.getThresholdAmount()))
                        .triggerAmount(ctx.recentTransactionTotal)
                        .triggerCount(ctx.recentTransactionCount).build();
            }
        }
        return null;
    }

    private AlertTrigger evaluateVelocity(AmlRule rule, TransactionContext ctx) {
        if (rule.getThresholdCount() == null) return null;
        if (ctx.recentTransactionCount >= rule.getThresholdCount()) {
            return AlertTrigger.builder()
                    .category(AmlRuleCategory.VELOCITY)
                    .description(String.format("High velocity: %d transactions in %d hours (threshold: %d)",
                            ctx.recentTransactionCount, rule.getThresholdPeriodHours(), rule.getThresholdCount()))
                    .triggerCount(ctx.recentTransactionCount).build();
        }
        return null;
    }

    private AlertTrigger evaluateRoundAmount(AmlRule rule, TransactionContext ctx) {
        BigDecimal[] divRem = ctx.amount.divideAndRemainder(new BigDecimal("1000"));
        boolean isRound = divRem[1].compareTo(BigDecimal.ZERO) == 0 &&
                ctx.amount.compareTo(new BigDecimal("5000")) >= 0;
        if (isRound && ctx.recentRoundAmountCount >= 3) {
            return AlertTrigger.builder()
                    .category(AmlRuleCategory.ROUND_AMOUNT)
                    .description(String.format("Multiple round-amount transactions: %d occurrences of amounts divisible by 1000",
                            ctx.recentRoundAmountCount))
                    .triggerAmount(ctx.amount).triggerCount(ctx.recentRoundAmountCount).build();
        }
        return null;
    }

    private AlertTrigger evaluatePep(AmlRule rule, TransactionContext ctx) {
        if (ctx.customerRiskRating == RiskRating.PEP) {
            if (rule.getThresholdAmount() != null && ctx.amount.compareTo(rule.getThresholdAmount()) >= 0) {
                return AlertTrigger.builder()
                        .category(AmlRuleCategory.PEP)
                        .description(String.format("PEP transaction: %s %s from politically exposed person",
                                ctx.amount, ctx.currency))
                        .triggerAmount(ctx.amount).build();
            }
        }
        return null;
    }

    private AlertTrigger evaluateDormantReactivation(AmlRule rule, TransactionContext ctx) {
        if (ctx.daysSinceLastTransaction > 180 && ctx.amount.compareTo(new BigDecimal("1000")) > 0) {
            return AlertTrigger.builder()
                    .category(AmlRuleCategory.DORMANT_REACTIVATION)
                    .description(String.format("Dormant account reactivation: %d days inactive, transaction %s %s",
                            ctx.daysSinceLastTransaction, ctx.amount, ctx.currency))
                    .triggerAmount(ctx.amount).build();
        }
        return null;
    }

    private AlertTrigger evaluateHighRiskCountry(AmlRule rule, TransactionContext ctx) {
        if (ctx.counterpartyCountry != null && rule.getRuleConfig().containsKey("high_risk_countries")) {
            String countries = rule.getRuleConfig().get("high_risk_countries").toString();
            if (countries.contains(ctx.counterpartyCountry)) {
                return AlertTrigger.builder()
                        .category(AmlRuleCategory.HIGH_RISK_COUNTRY)
                        .description(String.format("Transaction involving high-risk country: %s", ctx.counterpartyCountry))
                        .triggerAmount(ctx.amount).build();
            }
        }
        return null;
    }

    private AlertTrigger evaluateRapidMovement(AmlRule rule, TransactionContext ctx) {
        // Funds in and out within short period
        if (ctx.recentCreditTotal.compareTo(BigDecimal.ZERO) > 0 &&
                ctx.recentDebitTotal.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ratio = ctx.recentDebitTotal.divide(ctx.recentCreditTotal, 2, java.math.RoundingMode.HALF_UP);
            if (ratio.compareTo(new BigDecimal("0.80")) >= 0 &&
                    ctx.recentCreditTotal.compareTo(rule.getThresholdAmount() != null ? rule.getThresholdAmount() : new BigDecimal("50000")) >= 0) {
                return AlertTrigger.builder()
                        .category(AmlRuleCategory.RAPID_MOVEMENT)
                        .description(String.format("Rapid fund movement: %s credited, %s debited (%s%% ratio) in period",
                                ctx.recentCreditTotal, ctx.recentDebitTotal, ratio.multiply(BigDecimal.valueOf(100))))
                        .triggerAmount(ctx.recentCreditTotal).build();
            }
        }
        return null;
    }

    private boolean isApplicable(AmlRule rule, TransactionContext ctx) {
        if (!"ALL".equals(rule.getApplicableCustomerTypes()) && ctx.customerType != null) {
            if (!rule.getApplicableCustomerTypes().contains(ctx.customerType)) return false;
        }
        if (!"ALL".equals(rule.getApplicableChannels()) && ctx.channel != null) {
            if (!rule.getApplicableChannels().contains(ctx.channel)) return false;
        }
        return true;
    }

    @Getter @Setter @Builder
    public static class TransactionContext {
        private BigDecimal amount;
        private String currency;
        private String channel;
        private String customerType;
        private RiskRating customerRiskRating;
        private int recentTransactionCount;
        private BigDecimal recentTransactionTotal;
        private int recentRoundAmountCount;
        private int daysSinceLastTransaction;
        private String counterpartyCountry;
        private BigDecimal recentCreditTotal;
        private BigDecimal recentDebitTotal;
    }

    @Getter @Setter @Builder
    public static class AlertTrigger {
        private String ruleCode;
        private AmlRuleCategory category;
        private String severity;
        private String description;
        private BigDecimal triggerAmount;
        private Integer triggerCount;
    }
}
