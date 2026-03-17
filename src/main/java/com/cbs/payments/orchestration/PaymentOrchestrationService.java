package com.cbs.payments.orchestration;

import com.cbs.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PaymentOrchestrationService {

    private final PaymentRailRepository railRepository;
    private final PaymentRoutingRuleRepository ruleRepository;
    private final PaymentRoutingLogRepository logRepository;

    /**
     * Selects the optimal payment rail for a transaction.
     * 
     * Resolution order:
     * 1. Match against routing rules (highest priority first)
     * 2. If rule matches, use its preferred rail (fallback if preferred unavailable)
     * 3. If no rule matches, score all eligible rails by optimization criteria
     * 4. Log the routing decision
     */
    @Transactional
    public RoutingDecision routePayment(String paymentRef, String sourceCountry, String destinationCountry,
                                          String currencyCode, BigDecimal amount, String paymentType) {
        long startTime = System.currentTimeMillis();

        // 1. Get all active, available rails
        List<PaymentRail> allRails = railRepository.findByIsActiveTrueAndIsAvailableTrueOrderByPriorityRankAsc();

        // 2. Filter eligible rails
        List<PaymentRail> eligible = allRails.stream()
                .filter(r -> r.supportsCurrency(currencyCode))
                .filter(r -> r.supportsCountry(destinationCountry))
                .filter(r -> r.supportsAmount(amount))
                .toList();

        if (eligible.isEmpty()) {
            throw new BusinessException("No eligible payment rail for " + currencyCode + " to " + destinationCountry, "NO_ELIGIBLE_RAIL");
        }

        // 3. Match routing rules
        List<PaymentRoutingRule> rules = ruleRepository.findActiveRulesOrdered(LocalDate.now());
        PaymentRoutingRule matchedRule = null;
        PaymentRail selectedRail = null;
        boolean fallbackUsed = false;
        String optimizationReason = null;

        for (PaymentRoutingRule rule : rules) {
            if (rule.matches(sourceCountry, destinationCountry, currencyCode, amount, paymentType)) {
                matchedRule = rule;

                // Try preferred rail
                selectedRail = eligible.stream()
                        .filter(r -> r.getRailCode().equals(rule.getPreferredRailCode()))
                        .findFirst().orElse(null);

                if (selectedRail == null && rule.getFallbackRailCode() != null) {
                    selectedRail = eligible.stream()
                            .filter(r -> r.getRailCode().equals(rule.getFallbackRailCode()))
                            .findFirst().orElse(null);
                    if (selectedRail != null) fallbackUsed = true;
                }

                if (selectedRail != null) {
                    optimizationReason = "Rule match: " + rule.getRuleName() + " (optimize=" + rule.getOptimizeFor() + ")";
                    break;
                }
            }
        }

        // 4. No rule matched — score by default criteria (COST)
        if (selectedRail == null) {
            selectedRail = scoreAndSelect(eligible, amount, "COST");
            optimizationReason = "Auto-selected: lowest cost from " + eligible.size() + " candidates";
        }

        BigDecimal estimatedFee = selectedRail.calculateFee(amount);
        int routingTimeMs = (int)(System.currentTimeMillis() - startTime);

        // 5. Log
        PaymentRoutingLog routingLog = PaymentRoutingLog.builder()
                .paymentRef(paymentRef).sourceCountry(sourceCountry)
                .destinationCountry(destinationCountry).currencyCode(currencyCode)
                .amount(amount).paymentType(paymentType)
                .selectedRailCode(selectedRail.getRailCode())
                .fallbackUsed(fallbackUsed)
                .routingRuleId(matchedRule != null ? matchedRule.getId() : null)
                .optimizationReason(optimizationReason)
                .estimatedFee(estimatedFee).estimatedSpeed(selectedRail.getSettlementSpeed())
                .candidatesEvaluated(eligible.size()).routingTimeMs(routingTimeMs).build();
        logRepository.save(routingLog);

        log.info("Payment routed: ref={}, rail={}, fee={}, speed={}, candidates={}, time={}ms",
                paymentRef, selectedRail.getRailCode(), estimatedFee, selectedRail.getSettlementSpeed(),
                eligible.size(), routingTimeMs);

        return new RoutingDecision(selectedRail.getRailCode(), selectedRail.getRailName(),
                selectedRail.getSettlementSpeed(), estimatedFee, fallbackUsed, optimizationReason, eligible.size());
    }

    private PaymentRail scoreAndSelect(List<PaymentRail> eligible, BigDecimal amount, String optimizeFor) {
        return switch (optimizeFor) {
            case "SPEED" -> eligible.stream()
                    .min(Comparator.comparingInt(r -> speedScore(r.getSettlementSpeed())))
                    .orElse(eligible.get(0));
            case "AVAILABILITY" -> eligible.stream()
                    .max(Comparator.comparing(PaymentRail::getUptimePct))
                    .orElse(eligible.get(0));
            default -> // COST
                    eligible.stream()
                    .min(Comparator.comparing(r -> r.calculateFee(amount)))
                    .orElse(eligible.get(0));
        };
    }

    private int speedScore(String speed) {
        return switch (speed) {
            case "REAL_TIME" -> 1;
            case "SAME_DAY" -> 2;
            case "NEXT_DAY" -> 3;
            case "T_PLUS_2" -> 4;
            case "T_PLUS_3" -> 5;
            default -> 10;
        };
    }

    // CRUD
    @Transactional
    public PaymentRail createRail(PaymentRail rail) { return railRepository.save(rail); }

    @Transactional
    public PaymentRoutingRule createRule(PaymentRoutingRule rule) { return ruleRepository.save(rule); }

    public List<PaymentRail> getAllActiveRails() { return railRepository.findByIsActiveTrueAndIsAvailableTrueOrderByPriorityRankAsc(); }

    public record RoutingDecision(String railCode, String railName, String settlementSpeed,
                                    BigDecimal estimatedFee, boolean fallbackUsed,
                                    String reason, int candidatesEvaluated) {}
}
