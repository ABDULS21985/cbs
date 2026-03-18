package com.cbs.unit.risk;

import com.cbs.account.entity.Account;
import com.cbs.aml.engine.AmlMonitoringEngine;
import com.cbs.aml.entity.*;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.aml.repository.AmlRuleRepository;
import com.cbs.aml.service.AmlService;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.RiskRating;
import com.cbs.ecl.entity.EclCalculation;
import com.cbs.ecl.entity.EclModelParameter;
import com.cbs.ecl.repository.EclCalculationRepository;
import com.cbs.ecl.repository.EclModelParameterRepository;
import com.cbs.ecl.service.EclService;
import com.cbs.fraud.entity.FraudAlert;
import com.cbs.fraud.entity.FraudRule;
import com.cbs.fraud.repository.FraudAlertRepository;
import com.cbs.fraud.repository.FraudRuleRepository;
import com.cbs.fraud.service.FraudDetectionService;
import com.cbs.oprisk.entity.OpRiskKri;
import com.cbs.oprisk.entity.OpRiskKriReading;
import com.cbs.oprisk.entity.OpRiskLossEvent;
import com.cbs.oprisk.repository.OpRiskKriReadingRepository;
import com.cbs.oprisk.repository.OpRiskKriRepository;
import com.cbs.oprisk.repository.OpRiskLossEventRepository;
import com.cbs.oprisk.service.OpRiskService;
import com.cbs.sanctions.entity.ScreeningRequest;
import com.cbs.sanctions.entity.Watchlist;
import com.cbs.sanctions.repository.ScreeningRequestRepository;
import com.cbs.sanctions.repository.WatchlistRepository;
import com.cbs.sanctions.service.SanctionsScreeningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RiskComplianceTest {

    // ========================================================================
    // AmlService Tests
    // ========================================================================

    @Nested
    @DisplayName("AmlService - Transaction Screening and Alert Workflow Tests")
    @ExtendWith(MockitoExtension.class)
    class AmlServiceTests {

        @Mock private AmlRuleRepository ruleRepository;
        @Mock private AmlAlertRepository alertRepository;
        @Mock private AmlMonitoringEngine monitoringEngine;

        @InjectMocks private AmlService amlService;

        private Customer customer;
        private Account account;

        @BeforeEach
        void setUp() {
            customer = new Customer();
            customer.setId(1L);
            customer.setFirstName("John");
            customer.setLastName("Doe");

            account = new Account();
            account.setId(10L);
            account.setAccountNumber("1000000001");
        }

        @Test
        @DisplayName("screenTransaction generates alerts when monitoring engine triggers rules")
        void screenTransaction_generatesAlertsForTriggeredRules() {
            AmlRule rule = AmlRule.builder()
                    .id(1L).ruleCode("LARGE_CASH_001").ruleName("Large Cash Transaction")
                    .ruleCategory(AmlRuleCategory.LARGE_CASH).severity("HIGH").build();

            AmlMonitoringEngine.TransactionContext ctx = AmlMonitoringEngine.TransactionContext.builder()
                    .amount(new BigDecimal("50000.00"))
                    .currency("USD")
                    .channel("BRANCH")
                    .customerRiskRating(RiskRating.MEDIUM)
                    .recentTransactionCount(1)
                    .recentTransactionTotal(new BigDecimal("50000.00"))
                    .recentRoundAmountCount(0)
                    .daysSinceLastTransaction(5)
                    .recentCreditTotal(BigDecimal.ZERO)
                    .recentDebitTotal(BigDecimal.ZERO)
                    .build();

            AmlMonitoringEngine.AlertTrigger trigger = AmlMonitoringEngine.AlertTrigger.builder()
                    .ruleCode("LARGE_CASH_001")
                    .category(AmlRuleCategory.LARGE_CASH)
                    .severity("HIGH")
                    .description("Large cash transaction: 50000.00 USD")
                    .triggerAmount(new BigDecimal("50000.00"))
                    .build();

            when(ruleRepository.findByIsActiveTrueOrderByRuleNameAsc()).thenReturn(List.of(rule));
            when(monitoringEngine.evaluateTransaction(eq(ctx), anyList())).thenReturn(List.of(trigger));
            when(alertRepository.getNextAlertSequence()).thenReturn(1L);
            when(ruleRepository.findByRuleCode("LARGE_CASH_001")).thenReturn(Optional.of(rule));
            when(alertRepository.save(any(AmlAlert.class))).thenAnswer(inv -> inv.getArgument(0));

            List<AmlAlert> alerts = amlService.screenTransaction(ctx, customer, account);

            assertThat(alerts).hasSize(1);
            assertThat(alerts.get(0).getStatus()).isEqualTo(AmlAlertStatus.NEW);
            assertThat(alerts.get(0).getSeverity()).isEqualTo("HIGH");
            verify(alertRepository).save(any(AmlAlert.class));
        }

        @Test
        @DisplayName("escalateAlert sets status to ESCALATED and priority to CRITICAL")
        void escalateAlert_setsEscalatedStatusAndCriticalPriority() {
            AmlAlert alert = AmlAlert.builder()
                    .id(5L).alertRef("AML000000000001")
                    .status(AmlAlertStatus.UNDER_REVIEW).priority("HIGH").build();

            when(alertRepository.findByIdWithDetails(5L)).thenReturn(Optional.of(alert));
            when(alertRepository.save(any(AmlAlert.class))).thenAnswer(inv -> inv.getArgument(0));

            AmlAlert result = amlService.escalateAlert(5L);

            assertThat(result.getStatus()).isEqualTo(AmlAlertStatus.ESCALATED);
            assertThat(result.getPriority()).isEqualTo("CRITICAL");
        }
    }

    // ========================================================================
    // FraudDetectionService Tests
    // ========================================================================

    @Nested
    @DisplayName("FraudDetectionService - Scoring and Alert Tests")
    @ExtendWith(MockitoExtension.class)
    class FraudDetectionServiceTests {

        @Mock private FraudRuleRepository ruleRepository;
        @Mock private FraudAlertRepository alertRepository;

        @InjectMocks private FraudDetectionService fraudDetectionService;

        @Test
        @DisplayName("scoreTransaction returns alert with BLOCK action when score >= 80")
        void scoreTransaction_highScore_returnsBlockAlert() {
            FraudRule amountRule = FraudRule.builder()
                    .id(1L).ruleCode("AMT_ANOMALY_001").ruleName("Large Amount")
                    .ruleCategory("AMOUNT_ANOMALY").scoreWeight(50)
                    .applicableChannels("ALL")
                    .ruleConfig(Map.of("threshold", "10000"))
                    .isActive(true).build();

            FraudRule velocityRule = FraudRule.builder()
                    .id(2L).ruleCode("VELOCITY_001").ruleName("High Velocity")
                    .ruleCategory("VELOCITY").scoreWeight(40)
                    .applicableChannels("ALL")
                    .ruleConfig(Map.of("max_count", 5))
                    .isActive(true).build();

            when(ruleRepository.findByIsActiveTrueOrderByScoreWeightDesc())
                    .thenReturn(List.of(amountRule, velocityRule));
            when(alertRepository.getNextAlertSequence()).thenReturn(1L);
            when(alertRepository.save(any(FraudAlert.class))).thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> context = Map.of("recent_txn_count", 10);

            FraudAlert result = fraudDetectionService.scoreTransaction(
                    1L, 10L, "TXN-001", new BigDecimal("50000.00"),
                    "ONLINE", "device-123", "192.168.1.1", "London,UK", context);

            assertThat(result).isNotNull();
            assertThat(result.getRiskScore()).isGreaterThanOrEqualTo(80);
            assertThat(result.getActionTaken()).isEqualTo("BLOCK_TRANSACTION");
            verify(alertRepository).save(any(FraudAlert.class));
        }

        @Test
        @DisplayName("scoreTransaction returns null for clean transaction below threshold")
        void scoreTransaction_lowScore_returnsNull() {
            FraudRule amountRule = FraudRule.builder()
                    .id(1L).ruleCode("AMT_ANOMALY_001").ruleName("Large Amount")
                    .ruleCategory("AMOUNT_ANOMALY").scoreWeight(30)
                    .applicableChannels("ALL")
                    .ruleConfig(Map.of("threshold", "100000"))
                    .isActive(true).build();

            when(ruleRepository.findByIsActiveTrueOrderByScoreWeightDesc())
                    .thenReturn(List.of(amountRule));

            FraudAlert result = fraudDetectionService.scoreTransaction(
                    1L, 10L, "TXN-002", new BigDecimal("500.00"),
                    "POS", "device-456", "10.0.0.1", "Lagos,NG", Map.of());

            assertThat(result).isNull();
            verify(alertRepository, never()).save(any());
        }
    }

    // ========================================================================
    // SanctionsScreeningService Tests
    // ========================================================================

    @Nested
    @DisplayName("SanctionsScreeningService - Name Screening Tests")
    @ExtendWith(MockitoExtension.class)
    class SanctionsScreeningTests {

        @Mock private WatchlistRepository watchlistRepository;
        @Mock private ScreeningRequestRepository screeningRepository;

        @InjectMocks private SanctionsScreeningService sanctionsService;

        @Test
        @DisplayName("screenName returns CLEAR status when no watchlist matches found")
        void screenName_noMatches_returnsClear() {
            when(watchlistRepository.fuzzySearch(anyString(), anyList(), anyDouble()))
                    .thenReturn(List.of());
            when(screeningRepository.save(any(ScreeningRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            ScreeningRequest result = sanctionsService.screenName(
                    "CUSTOMER", "John Smith", "INDIVIDUAL",
                    null, "US", null, 1L, null, null, null);

            assertThat(result.getStatus()).isEqualTo("CLEAR");
            assertThat(result.getTotalMatches()).isZero();
            verify(screeningRepository).save(any(ScreeningRequest.class));
        }

        @Test
        @DisplayName("screenName returns POTENTIAL_MATCH when watchlist hit exceeds threshold")
        void screenName_matchFound_returnsPotentialMatch() {
            Watchlist watchlistEntry = Watchlist.builder()
                    .id(1L).listCode("OFAC_SDN").listName("OFAC SDN")
                    .listSource("OFAC").entryId("SDN-12345")
                    .entityType("INDIVIDUAL").primaryName("JOHN SMITH")
                    .dateOfBirth(LocalDate.of(1985, 3, 15))
                    .build();

            when(watchlistRepository.fuzzySearch(anyString(), anyList(), anyDouble()))
                    .thenReturn(List.of(watchlistEntry));
            when(screeningRepository.save(any(ScreeningRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            ScreeningRequest result = sanctionsService.screenName(
                    "CUSTOMER", "JOHN SMITH", "INDIVIDUAL",
                    LocalDate.of(1985, 3, 15), "US", null, 1L, null, null, new BigDecimal("85.00"));

            assertThat(result.getStatus()).isEqualTo("POTENTIAL_MATCH");
            assertThat(result.getMatches()).isNotEmpty();
        }
    }

    // ========================================================================
    // OpRiskService Tests
    // ========================================================================

    @Nested
    @DisplayName("OpRiskService - Loss Event and KRI Tests")
    @ExtendWith(MockitoExtension.class)
    class OpRiskServiceTests {

        @Mock private OpRiskLossEventRepository lossEventRepository;
        @Mock private OpRiskKriRepository kriRepository;
        @Mock private OpRiskKriReadingRepository readingRepository;

        @InjectMocks private OpRiskService opRiskService;

        @Test
        @DisplayName("reportLossEvent calculates net loss and persists event with REPORTED status")
        void reportLossEvent_calculatesNetLossAndSaves() {
            when(lossEventRepository.save(any(OpRiskLossEvent.class))).thenAnswer(inv -> inv.getArgument(0));

            OpRiskLossEvent result = opRiskService.reportLossEvent(
                    "INTERNAL_FRAUD", "Unauthorized Trading", "Trader exceeded limits",
                    new BigDecimal("500000.00"), new BigDecimal("100000.00"), "USD",
                    "TREASURY", "Trading Desk", LocalDate.now().minusDays(3),
                    LocalDate.now(), "risk_officer_1");

            assertThat(result.getStatus()).isEqualTo("REPORTED");
            assertThat(result.getNetLoss()).isEqualByComparingTo(new BigDecimal("400000.00"));
            assertThat(result.getGrossLoss()).isEqualByComparingTo(new BigDecimal("500000.00"));
            verify(lossEventRepository).save(any(OpRiskLossEvent.class));
        }

        @Test
        @DisplayName("recordKriReading evaluates RAG status as RED when value exceeds red threshold")
        void recordKriReading_evaluatesRedRag() {
            OpRiskKri kri = OpRiskKri.builder()
                    .id(1L).kriCode("SYS_DOWNTIME")
                    .kriName("System Downtime Hours")
                    .kriCategory("IT_RISK")
                    .measurementUnit("HOURS")
                    .thresholdAmber(new BigDecimal("2.0"))
                    .thresholdRed(new BigDecimal("5.0"))
                    .frequency("DAILY")
                    .isActive(true).build();

            when(kriRepository.findByKriCode("SYS_DOWNTIME")).thenReturn(Optional.of(kri));
            when(readingRepository.save(any(OpRiskKriReading.class))).thenAnswer(inv -> inv.getArgument(0));

            OpRiskKriReading result = opRiskService.recordKriReading(
                    "SYS_DOWNTIME", LocalDate.now(), new BigDecimal("8.5"), "Major outage in core banking");

            assertThat(result.getRagStatus()).isEqualTo("RED");
            assertThat(result.getValue()).isEqualByComparingTo(new BigDecimal("8.5"));
            verify(readingRepository).save(any(OpRiskKriReading.class));
        }
    }

    // ========================================================================
    // EclService Tests
    // ========================================================================

    @Nested
    @DisplayName("EclService - ECL Calculation Tests")
    @ExtendWith(MockitoExtension.class)
    class EclServiceTests {

        @Mock private EclModelParameterRepository paramRepository;
        @Mock private EclCalculationRepository calcRepository;

        @InjectMocks private EclService eclService;

        @Test
        @DisplayName("calculateEcl assigns Stage 1 for performing loan with DPD <= 30")
        void calculateEcl_performingLoan_assignsStage1() {
            EclModelParameter baseParam = EclModelParameter.builder()
                    .parameterName("RETAIL_BASE").segment("RETAIL").stage(1)
                    .pd12Month(new BigDecimal("0.02")).pdLifetime(new BigDecimal("0.08"))
                    .lgdRate(new BigDecimal("0.45")).eadCcf(BigDecimal.ONE)
                    .macroScenario("BASE").scenarioWeight(new BigDecimal("0.50"))
                    .macroAdjustment(BigDecimal.ZERO).effectiveDate(LocalDate.now()).build();

            EclModelParameter optParam = EclModelParameter.builder()
                    .parameterName("RETAIL_OPT").segment("RETAIL").stage(1)
                    .pd12Month(new BigDecimal("0.015")).pdLifetime(new BigDecimal("0.06"))
                    .lgdRate(new BigDecimal("0.40")).eadCcf(BigDecimal.ONE)
                    .macroScenario("OPTIMISTIC").scenarioWeight(new BigDecimal("0.25"))
                    .macroAdjustment(new BigDecimal("-0.01")).effectiveDate(LocalDate.now()).build();

            EclModelParameter pessParam = EclModelParameter.builder()
                    .parameterName("RETAIL_PESS").segment("RETAIL").stage(1)
                    .pd12Month(new BigDecimal("0.03")).pdLifetime(new BigDecimal("0.12"))
                    .lgdRate(new BigDecimal("0.55")).eadCcf(BigDecimal.ONE)
                    .macroScenario("PESSIMISTIC").scenarioWeight(new BigDecimal("0.25"))
                    .macroAdjustment(new BigDecimal("0.02")).effectiveDate(LocalDate.now()).build();

            when(paramRepository.findActiveParams(eq("RETAIL"), eq(1), any(LocalDate.class)))
                    .thenReturn(List.of(baseParam, optParam, pessParam));
            when(calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(100L))
                    .thenReturn(Optional.empty());
            when(calcRepository.save(any(EclCalculation.class))).thenAnswer(inv -> inv.getArgument(0));

            EclCalculation result = eclService.calculateEcl(
                    100L, 1L, "RETAIL", "PL-001",
                    new BigDecimal("500000.00"), BigDecimal.ZERO, 10, false);

            assertThat(result.getCurrentStage()).isEqualTo(1);
            assertThat(result.getStageReason()).contains("Performing");
            assertThat(result.getEad()).isEqualByComparingTo(new BigDecimal("500000.00"));
            assertThat(result.getEclWeighted()).isNotNull();
            assertThat(result.getEclWeighted().signum()).isGreaterThan(0);
            verify(calcRepository).save(any(EclCalculation.class));
        }

        @Test
        @DisplayName("calculateEcl assigns Stage 3 for credit-impaired loan with DPD > 90")
        void calculateEcl_creditImpaired_assignsStage3() {
            EclModelParameter baseParam = EclModelParameter.builder()
                    .parameterName("RETAIL_BASE_S3").segment("RETAIL").stage(3)
                    .pd12Month(new BigDecimal("0.50")).pdLifetime(new BigDecimal("0.80"))
                    .lgdRate(new BigDecimal("0.65")).eadCcf(BigDecimal.ONE)
                    .macroScenario("BASE").scenarioWeight(new BigDecimal("0.50"))
                    .macroAdjustment(BigDecimal.ZERO).effectiveDate(LocalDate.now()).build();

            when(paramRepository.findActiveParams(eq("RETAIL"), eq(3), any(LocalDate.class)))
                    .thenReturn(List.of(baseParam));
            when(calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(200L))
                    .thenReturn(Optional.empty());
            when(calcRepository.save(any(EclCalculation.class))).thenAnswer(inv -> inv.getArgument(0));

            EclCalculation result = eclService.calculateEcl(
                    200L, 2L, "RETAIL", "PL-002",
                    new BigDecimal("300000.00"), BigDecimal.ZERO, 120, false);

            assertThat(result.getCurrentStage()).isEqualTo(3);
            assertThat(result.getStageReason()).contains("Credit-impaired");
            assertThat(result.getDaysPastDue()).isEqualTo(120);
            assertThat(result.getEclWeighted()).isNotNull();
        }
    }
}
