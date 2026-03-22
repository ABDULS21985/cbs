package com.cbs.wealthmgmt;

import com.cbs.wealthmgmt.entity.WealthAdvisor;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.repository.WealthAdvisorRepository;
import com.cbs.wealthmgmt.repository.WealthManagementPlanRepository;
import com.cbs.wealthmgmt.service.WealthManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WealthManagementServiceTest {

    @Mock
    private WealthManagementPlanRepository planRepository;

    @Mock
    private WealthAdvisorRepository advisorRepository;

    @InjectMocks
    private WealthManagementService service;

    private WealthManagementPlan buildPlan(String code, String status) {
        WealthManagementPlan plan = new WealthManagementPlan();
        plan.setId(1L);
        plan.setPlanCode(code);
        plan.setCustomerId(101L);
        plan.setPlanType("COMPREHENSIVE");
        plan.setStatus(status);
        return plan;
    }

    private WealthAdvisor buildAdvisor(String code) {
        WealthAdvisor advisor = new WealthAdvisor();
        advisor.setId(1L);
        advisor.setAdvisorCode(code);
        advisor.setFullName("Jane Doe");
        advisor.setEmail("jane@cbs.ng");
        advisor.setStatus("ACTIVE");
        advisor.setMaxClients(30);
        return advisor;
    }

    // ─── Plan tests ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Create plan generates WMP- code and sets DRAFT status")
    void createPlanGeneratesCodeAndSetsStatus() {
        when(planRepository.save(any(WealthManagementPlan.class))).thenAnswer(i -> {
            WealthManagementPlan saved = i.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        WealthManagementPlan input = new WealthManagementPlan();
        input.setCustomerId(101L);
        input.setPlanType("COMPREHENSIVE");
        input.setTotalNetWorth(BigDecimal.valueOf(5000000));
        input.setTotalInvestableAssets(BigDecimal.valueOf(2000000));

        WealthManagementPlan result = service.create(input);

        assertThat(result.getPlanCode()).startsWith("WMP-");
        assertThat(result.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("Activate plan sets ACTIVE status and activated date")
    void activateSetsStatusAndDate() {
        WealthManagementPlan plan = buildPlan("WMP-TEST001", "DRAFT");
        when(planRepository.findByPlanCode("WMP-TEST001")).thenReturn(Optional.of(plan));
        when(planRepository.save(any(WealthManagementPlan.class))).thenAnswer(i -> i.getArgument(0));

        WealthManagementPlan result = service.activate("WMP-TEST001");

        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getActivatedDate()).isNotNull();
    }

    @Test
    @DisplayName("Close plan sets CLOSED status")
    void closeSetsClosedStatus() {
        WealthManagementPlan plan = buildPlan("WMP-TEST002", "ACTIVE");
        when(planRepository.findByPlanCode("WMP-TEST002")).thenReturn(Optional.of(plan));
        when(planRepository.save(any(WealthManagementPlan.class))).thenAnswer(i -> i.getArgument(0));

        WealthManagementPlan result = service.closePlan("WMP-TEST002");

        assertThat(result.getStatus()).isEqualTo("CLOSED");
    }

    @Test
    @DisplayName("Update plan applies partial updates without nullifying other fields")
    void updatePlanAppliesPartialUpdates() {
        WealthManagementPlan plan = buildPlan("WMP-TEST003", "ACTIVE");
        plan.setTotalNetWorth(BigDecimal.valueOf(5000000));
        plan.setRiskProfile("MODERATE");

        when(planRepository.findByPlanCode("WMP-TEST003")).thenReturn(Optional.of(plan));
        when(planRepository.save(any(WealthManagementPlan.class))).thenAnswer(i -> i.getArgument(0));

        WealthManagementPlan updates = new WealthManagementPlan();
        updates.setRiskProfile("AGGRESSIVE");
        updates.setInvestmentHorizon(20);

        WealthManagementPlan result = service.updatePlan("WMP-TEST003", updates);

        assertThat(result.getRiskProfile()).isEqualTo("AGGRESSIVE");
        assertThat(result.getInvestmentHorizon()).isEqualTo(20);
        assertThat(result.getTotalNetWorth()).isEqualByComparingTo(BigDecimal.valueOf(5000000));
    }

    @Test
    @DisplayName("Add goal appends to existing financial goals list")
    void addGoalAppendsToList() {
        WealthManagementPlan plan = buildPlan("WMP-TEST004", "ACTIVE");
        plan.setFinancialGoals(new ArrayList<>(List.of(
                Map.of("name", "Retirement", "targetAmount", 20000000)
        )));

        when(planRepository.findByPlanCode("WMP-TEST004")).thenReturn(Optional.of(plan));
        when(planRepository.save(any(WealthManagementPlan.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> newGoal = new HashMap<>();
        newGoal.put("name", "Education Fund");
        newGoal.put("targetAmount", 5000000);

        WealthManagementPlan result = service.addGoal("WMP-TEST004", newGoal);

        assertThat(result.getFinancialGoals()).hasSize(2);
        assertThat(result.getFinancialGoals().get(1).get("name")).isEqualTo("Education Fund");
        assertThat(result.getFinancialGoals().get(1)).containsKey("id");
    }

    @Test
    @DisplayName("Add goal creates new list when financial goals is null")
    void addGoalCreatesNewListWhenNull() {
        WealthManagementPlan plan = buildPlan("WMP-TEST005", "ACTIVE");
        plan.setFinancialGoals(null);

        when(planRepository.findByPlanCode("WMP-TEST005")).thenReturn(Optional.of(plan));
        when(planRepository.save(any(WealthManagementPlan.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> goal = new HashMap<>();
        goal.put("name", "First Goal");

        WealthManagementPlan result = service.addGoal("WMP-TEST005", goal);

        assertThat(result.getFinancialGoals()).hasSize(1);
        assertThat(result.getFinancialGoals().get(0).get("name")).isEqualTo("First Goal");
    }

    // ─── Advisor tests ───────────────────────────────────────────────────────

    @Test
    @DisplayName("Create advisor generates ADV- code and sets defaults")
    void createAdvisorGeneratesCodeAndSetsDefaults() {
        when(advisorRepository.save(any(WealthAdvisor.class))).thenAnswer(i -> {
            WealthAdvisor saved = i.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        WealthAdvisor input = new WealthAdvisor();
        input.setFullName("John Doe");
        input.setEmail("john@cbs.ng");

        WealthAdvisor result = service.createAdvisor(input);

        assertThat(result.getAdvisorCode()).startsWith("ADV-");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getJoinDate()).isNotNull();
    }

    @Test
    @DisplayName("Update advisor applies partial updates")
    void updateAdvisorAppliesPartialUpdates() {
        WealthAdvisor advisor = buildAdvisor("ADV-TEST001");
        when(advisorRepository.findByAdvisorCode("ADV-TEST001")).thenReturn(Optional.of(advisor));
        when(advisorRepository.save(any(WealthAdvisor.class))).thenAnswer(i -> i.getArgument(0));

        WealthAdvisor updates = new WealthAdvisor();
        updates.setMaxClients(50);
        updates.setManagementFeePct(new BigDecimal("0.0150"));

        WealthAdvisor result = service.updateAdvisor("ADV-TEST001", updates);

        assertThat(result.getMaxClients()).isEqualTo(50);
        assertThat(result.getManagementFeePct()).isEqualByComparingTo(new BigDecimal("0.0150"));
        assertThat(result.getFullName()).isEqualTo("Jane Doe"); // unchanged
    }

    @Test
    @DisplayName("Compute advisor metrics returns real aggregated data")
    void computeAdvisorMetricsFromRealData() {
        WealthAdvisor advisor = buildAdvisor("ADV-TEST002");
        when(advisorRepository.findByAdvisorCode("ADV-TEST002")).thenReturn(Optional.of(advisor));

        WealthManagementPlan plan1 = buildPlan("WMP-P1", "ACTIVE");
        plan1.setTotalInvestableAssets(BigDecimal.valueOf(2000000));
        plan1.setYtdReturn(BigDecimal.valueOf(10.0));
        plan1.setBenchmarkReturn(BigDecimal.valueOf(8.0));
        plan1.setFeesChargedYtd(BigDecimal.valueOf(25000));
        plan1.setAdvisorId("ADV-TEST002");

        WealthManagementPlan plan2 = buildPlan("WMP-P2", "ACTIVE");
        plan2.setId(2L);
        plan2.setCustomerId(102L);
        plan2.setTotalInvestableAssets(BigDecimal.valueOf(3000000));
        plan2.setYtdReturn(BigDecimal.valueOf(12.0));
        plan2.setBenchmarkReturn(BigDecimal.valueOf(8.0));
        plan2.setFeesChargedYtd(BigDecimal.valueOf(37500));
        plan2.setAdvisorId("ADV-TEST002");

        when(planRepository.findByAdvisorIdOrderByPlanCodeAsc("ADV-TEST002"))
                .thenReturn(List.of(plan1, plan2));

        Map<String, Object> metrics = service.computeAdvisorMetrics("ADV-TEST002");

        assertThat(metrics.get("advisorCode")).isEqualTo("ADV-TEST002");
        assertThat(metrics.get("advisorName")).isEqualTo("Jane Doe");
        assertThat(((BigDecimal) metrics.get("totalAum"))).isEqualByComparingTo(BigDecimal.valueOf(5000000));
        assertThat((long) metrics.get("clientCount")).isEqualTo(2);
        assertThat(((BigDecimal) metrics.get("totalFeesYtd"))).isEqualByComparingTo(BigDecimal.valueOf(62500));
        // Weighted avg return: (10*2M + 12*3M) / 5M = 56M/5M = 11.2
        assertThat((double) metrics.get("ytdReturn")).isEqualTo(11.2);
    }

    // ─── Analytics tests ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Compute AUM by segment groups plans correctly")
    void computeAumBySegmentGroupsCorrectly() {
        WealthManagementPlan small = buildPlan("WMP-S1", "ACTIVE");
        small.setTotalInvestableAssets(BigDecimal.valueOf(50000000)); // Mass Affluent
        small.setYtdReturn(BigDecimal.valueOf(8.0));

        WealthManagementPlan large = buildPlan("WMP-L1", "ACTIVE");
        large.setId(2L);
        large.setCustomerId(102L);
        large.setTotalInvestableAssets(BigDecimal.valueOf(200000000)); // HNWI
        large.setYtdReturn(BigDecimal.valueOf(12.0));

        when(planRepository.findByStatus("ACTIVE")).thenReturn(List.of(small, large));

        List<Map<String, Object>> segments = service.computeAumBySegment();

        assertThat(segments).hasSize(3);
        // HNWI segment should have 1 client with 200M
        Map<String, Object> hnwi = segments.stream().filter(s -> "HNWI".equals(s.get("segment"))).findFirst().orElseThrow();
        assertThat(((BigDecimal) hnwi.get("totalAum"))).isEqualByComparingTo(BigDecimal.valueOf(200000000));
        assertThat((long) hnwi.get("clientCount")).isEqualTo(1);
    }

    @Test
    @DisplayName("Compute concentration risk returns sorted top clients")
    void computeConcentrationRiskReturnsSorted() {
        WealthManagementPlan plan1 = buildPlan("WMP-C1", "ACTIVE");
        plan1.setTotalInvestableAssets(BigDecimal.valueOf(3000000));
        plan1.setCustomerName("Client A");

        WealthManagementPlan plan2 = buildPlan("WMP-C2", "ACTIVE");
        plan2.setId(2L);
        plan2.setCustomerId(102L);
        plan2.setTotalInvestableAssets(BigDecimal.valueOf(7000000));
        plan2.setCustomerName("Client B");

        when(planRepository.findByStatus("ACTIVE")).thenReturn(List.of(plan1, plan2));

        List<Map<String, Object>> risk = service.computeConcentrationRisk(10);

        assertThat(risk).hasSize(2);
        assertThat(risk.get(0).get("clientName")).isEqualTo("Client B"); // higher AUM first
        assertThat(((double) risk.get(0).get("percentOfTotal"))).isEqualTo(70.0);
    }

    @Test
    @DisplayName("Compute fee breakdown uses real plan-level rates")
    void computeFeeBreakdownUsesRealRates() {
        WealthManagementPlan plan = buildPlan("WMP-F1", "ACTIVE");
        plan.setTotalInvestableAssets(BigDecimal.valueOf(1200000));
        plan.setAdvisoryFeePct(new BigDecimal("0.0100")); // 1%
        plan.setManagementFeePct(new BigDecimal("0.0200")); // 2%
        plan.setPerformanceFeePct(new BigDecimal("0.0050")); // 0.5%

        when(planRepository.findByStatus("ACTIVE")).thenReturn(List.of(plan));

        Map<String, BigDecimal> fees = service.computeFeeBreakdown();

        // Monthly: advisory = 1.2M * 1% / 12 = 1000
        assertThat(fees.get("advisoryFees")).isEqualByComparingTo(BigDecimal.valueOf(1000));
        // Monthly: management = 1.2M * 2% / 12 = 2000
        assertThat(fees.get("managementFees")).isEqualByComparingTo(BigDecimal.valueOf(2000));
        // Monthly: performance = 1.2M * 0.5% / 12 = 500
        assertThat(fees.get("performanceFees")).isEqualByComparingTo(BigDecimal.valueOf(500));
        assertThat(fees.get("totalFees")).isEqualByComparingTo(BigDecimal.valueOf(3500));
    }
}
