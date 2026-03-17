package com.cbs.payments;

import com.cbs.payments.orchestration.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentOrchestrationServiceTest {

    @Mock private PaymentRailRepository railRepository;
    @Mock private PaymentRoutingRuleRepository ruleRepository;
    @Mock private PaymentRoutingLogRepository logRepository;

    @InjectMocks private PaymentOrchestrationService orchestrationService;

    private PaymentRail instantRail;
    private PaymentRail swiftRail;
    private PaymentRail achRail;

    @BeforeEach
    void setUp() {
        instantRail = PaymentRail.builder().id(1L).railCode("NIP").railName("Instant Pay")
                .railType("INSTANT").settlementSpeed("REAL_TIME")
                .supportedCurrencies(List.of("NGN","USD")).supportedCountries(List.of("NGA"))
                .flatFee(new BigDecimal("25")).percentageFee(BigDecimal.ZERO)
                .maxAmount(new BigDecimal("10000000"))
                .isActive(true).isAvailable(true).priorityRank(1)
                .uptimePct(new BigDecimal("99.9")).build();

        swiftRail = PaymentRail.builder().id(2L).railCode("SWIFT").railName("SWIFT MT103")
                .railType("SWIFT").settlementSpeed("T_PLUS_2")
                .supportedCurrencies(List.of("*")).supportedCountries(List.of("*"))
                .flatFee(new BigDecimal("35")).percentageFee(new BigDecimal("0.10"))
                .isActive(true).isAvailable(true).priorityRank(50)
                .uptimePct(new BigDecimal("99.5")).build();

        achRail = PaymentRail.builder().id(3L).railCode("ACH").railName("ACH Batch")
                .railType("ACH").settlementSpeed("NEXT_DAY")
                .supportedCurrencies(List.of("USD")).supportedCountries(List.of("USA"))
                .flatFee(new BigDecimal("0.50")).percentageFee(BigDecimal.ZERO)
                .isActive(true).isAvailable(true).priorityRank(30)
                .uptimePct(new BigDecimal("99.8")).build();
    }

    @Test
    @DisplayName("Should route domestic NGN payment to NIP (rule match)")
    void routeByRule_Domestic() {
        PaymentRoutingRule domesticRule = PaymentRoutingRule.builder()
                .id(1L).ruleName("Domestic NGN").rulePriority(1)
                .sourceCountry("NGA").destinationCountry("NGA").currencyCode("NGN")
                .preferredRailCode("NIP").optimizeFor("SPEED")
                .isActive(true).effectiveFrom(LocalDate.now()).build();

        when(railRepository.findByIsActiveTrueAndIsAvailableTrueOrderByPriorityRankAsc())
                .thenReturn(List.of(instantRail, achRail, swiftRail));
        when(ruleRepository.findActiveRulesOrdered(any())).thenReturn(List.of(domesticRule));
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var decision = orchestrationService.routePayment("PAY001", "NGA", "NGA", "NGN", new BigDecimal("50000"), "TRANSFER");

        assertThat(decision.railCode()).isEqualTo("NIP");
        assertThat(decision.settlementSpeed()).isEqualTo("REAL_TIME");
        assertThat(decision.estimatedFee()).isEqualByComparingTo(new BigDecimal("25.00"));
    }

    @Test
    @DisplayName("Should auto-select cheapest rail when no rule matches")
    void routeByAutoSelect_CheapestCost() {
        when(railRepository.findByIsActiveTrueAndIsAvailableTrueOrderByPriorityRankAsc())
                .thenReturn(List.of(instantRail, achRail, swiftRail));
        when(ruleRepository.findActiveRulesOrdered(any())).thenReturn(List.of());
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // USD to USA — ACH ($0.50) is cheapest vs SWIFT ($35 + 0.1%)
        var decision = orchestrationService.routePayment("PAY002", "USA", "USA", "USD", new BigDecimal("1000"), "TRANSFER");

        assertThat(decision.railCode()).isEqualTo("ACH");
        assertThat(decision.estimatedFee()).isEqualByComparingTo(new BigDecimal("0.50"));
        assertThat(decision.reason()).contains("lowest cost");
    }

    @Test
    @DisplayName("Should use fallback rail when preferred is unavailable")
    void routeByRule_Fallback() {
        PaymentRoutingRule rule = PaymentRoutingRule.builder()
                .id(2L).ruleName("International USD").rulePriority(1)
                .currencyCode("USD").destinationCountry("GBR")
                .preferredRailCode("BLOCKCHAIN").fallbackRailCode("SWIFT")
                .optimizeFor("COST").isActive(true).effectiveFrom(LocalDate.now()).build();

        when(railRepository.findByIsActiveTrueAndIsAvailableTrueOrderByPriorityRankAsc())
                .thenReturn(List.of(swiftRail, achRail)); // No BLOCKCHAIN rail available
        when(ruleRepository.findActiveRulesOrdered(any())).thenReturn(List.of(rule));
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var decision = orchestrationService.routePayment("PAY003", "USA", "GBR", "USD", new BigDecimal("5000"), "TRANSFER");

        assertThat(decision.railCode()).isEqualTo("SWIFT");
        assertThat(decision.fallbackUsed()).isTrue();
    }

    @Test
    @DisplayName("PaymentRail.calculateFee: flat + percentage")
    void railFeeCalculation() {
        assertThat(swiftRail.calculateFee(new BigDecimal("10000")))
                .isEqualByComparingTo(new BigDecimal("45.00")); // 35 + (10000 × 0.10%)
    }

    @Test
    @DisplayName("PaymentRoutingRule.matches: filters by all criteria")
    void ruleMatching() {
        PaymentRoutingRule rule = PaymentRoutingRule.builder()
                .sourceCountry("NGA").destinationCountry("GBR").currencyCode("USD")
                .minAmount(new BigDecimal("100")).maxAmount(new BigDecimal("100000"))
                .preferredRailCode("SWIFT").build();

        assertThat(rule.matches("NGA", "GBR", "USD", new BigDecimal("5000"), null)).isTrue();
        assertThat(rule.matches("USA", "GBR", "USD", new BigDecimal("5000"), null)).isFalse();
        assertThat(rule.matches("NGA", "GBR", "USD", new BigDecimal("50"), null)).isFalse(); // below min
        assertThat(rule.matches("NGA", "GBR", "EUR", new BigDecimal("5000"), null)).isFalse(); // wrong ccy
    }
}
