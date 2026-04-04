package com.cbs.islamicaml.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.islamicaml.dto.IslamicAmlAlertResponse;
import com.cbs.islamicaml.dto.IslamicAmlAlertStatistics;
import com.cbs.islamicaml.entity.*;
import com.cbs.islamicaml.repository.IslamicAmlAlertRepository;
import com.cbs.islamicaml.repository.IslamicAmlRuleRepository;
import com.cbs.murabaha.entity.CommodityMurabahaTrade;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.CommodityMurabahaTradeRepository;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IslamicAmlMonitoringServiceTest {

    @Mock private IslamicAmlRuleRepository ruleRepository;
    @Mock private IslamicAmlAlertRepository alertRepository;
    @Mock private MurabahaContractRepository murabahaContractRepository;
    @Mock private CommodityMurabahaTradeRepository commodityMurabahaTradeRepository;
    @Mock private CurrentActorProvider actorProvider;
    @Mock private CurrentTenantResolver tenantResolver;

    @InjectMocks private IslamicAmlMonitoringService service;

    // ===================== TAWARRUQ MONITORING =====================

    @Test
    @DisplayName("Two Tawarruq contracts within 7 days generates round-tripping alert")
    void twoTawarruqWithin7Days_generatesAlert() {
        Long customerId = 100L;

        MurabahaContract contract1 = MurabahaContract.builder()
                .id(1L)
                .contractRef("MC-001")
                .customerId(customerId)
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .status(MurabahaDomainEnums.ContractStatus.ACTIVE)
                .financedAmount(new BigDecimal("100000"))
                .currencyCode("SAR")
                .build();

        MurabahaContract contract2 = MurabahaContract.builder()
                .id(2L)
                .contractRef("MC-002")
                .customerId(customerId)
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .status(MurabahaDomainEnums.ContractStatus.ACTIVE)
                .financedAmount(new BigDecimal("100000"))
                .currencyCode("SAR")
                .build();

        CommodityMurabahaTrade trade1 = CommodityMurabahaTrade.builder()
                .id(1L)
                .contractId(1L)
                .tradeRef("TRD-001")
                .purchaseDate(LocalDate.now().minusDays(10))
                .customerSaleDate(LocalDate.now().minusDays(8))
                .purchasePrice(new BigDecimal("100000"))
                .purchaseCurrency("SAR")
                .purchaseBrokerName("Broker A")
                .build();

        CommodityMurabahaTrade trade2 = CommodityMurabahaTrade.builder()
                .id(2L)
                .contractId(2L)
                .tradeRef("TRD-002")
                .purchaseDate(LocalDate.now().minusDays(6))
                .customerSaleDate(LocalDate.now().minusDays(4))
                .purchasePrice(new BigDecimal("100000"))
                .purchaseCurrency("SAR")
                .purchaseBrokerName("Broker B")
                .build();

        when(murabahaContractRepository.findByCustomerId(customerId))
                .thenReturn(List.of(contract1, contract2));
        when(commodityMurabahaTradeRepository.findByContractId(1L)).thenReturn(Optional.of(trade1));
        when(commodityMurabahaTradeRepository.findByContractId(2L)).thenReturn(Optional.of(trade2));
        when(ruleRepository.findByCategoryAndEnabledTrue(IslamicAmlRuleCategory.TAWARRUQ_ABUSE))
                .thenReturn(List.of());
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(alertRepository.save(any(IslamicAmlAlert.class))).thenAnswer(inv -> {
            IslamicAmlAlert a = inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        List<IslamicAmlAlertResponse> alerts = service.monitorTawarruqPatterns(customerId, 90);

        assertFalse(alerts.isEmpty(), "Should generate at least one alert for rapid sequential trades");
        verify(alertRepository, atLeastOnce()).save(argThat(alert ->
                alert.getIslamicContext() != null
                        && alert.getIslamicContext().containsKey("pattern")));
    }

    @Test
    @DisplayName("Single Tawarruq with 60-day gap generates no alert")
    void singleTawarruqWith60DayGap_noAlert() {
        Long customerId = 200L;

        MurabahaContract contract = MurabahaContract.builder()
                .id(10L)
                .contractRef("MC-010")
                .customerId(customerId)
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .status(MurabahaDomainEnums.ContractStatus.ACTIVE)
                .financedAmount(new BigDecimal("50000"))
                .currencyCode("SAR")
                .build();

        CommodityMurabahaTrade trade = CommodityMurabahaTrade.builder()
                .id(10L)
                .contractId(10L)
                .tradeRef("TRD-010")
                .purchaseDate(LocalDate.now().minusDays(60))
                .customerSaleDate(LocalDate.now().minusDays(58))
                .purchasePrice(new BigDecimal("50000"))
                .purchaseCurrency("SAR")
                .build();

        when(murabahaContractRepository.findByCustomerId(customerId))
                .thenReturn(List.of(contract));
        when(commodityMurabahaTradeRepository.findByContractId(10L)).thenReturn(Optional.of(trade));
        when(ruleRepository.findByCategoryAndEnabledTrue(IslamicAmlRuleCategory.TAWARRUQ_ABUSE))
                .thenReturn(List.of());

        List<IslamicAmlAlertResponse> alerts = service.monitorTawarruqPatterns(customerId, 90);

        assertTrue(alerts.isEmpty(), "Single trade with wide gap should not generate alerts");
    }

    @Test
    @DisplayName("Tawarruq amounts below CTR threshold triggers structuring alert")
    void tawarruqBelowThreshold_structuringAlert() {
        Long customerId = 300L;

        MurabahaContract contract1 = MurabahaContract.builder()
                .id(20L).contractRef("MC-020").customerId(customerId)
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .status(MurabahaDomainEnums.ContractStatus.ACTIVE)
                .financedAmount(new BigDecimal("195000")).currencyCode("SAR").build();

        MurabahaContract contract2 = MurabahaContract.builder()
                .id(21L).contractRef("MC-021").customerId(customerId)
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .status(MurabahaDomainEnums.ContractStatus.ACTIVE)
                .financedAmount(new BigDecimal("195000")).currencyCode("SAR").build();

        MurabahaContract contract3 = MurabahaContract.builder()
                .id(22L).contractRef("MC-022").customerId(customerId)
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .status(MurabahaDomainEnums.ContractStatus.ACTIVE)
                .financedAmount(new BigDecimal("195000")).currencyCode("SAR").build();

        CommodityMurabahaTrade trade1 = CommodityMurabahaTrade.builder()
                .id(20L).contractId(20L).tradeRef("TRD-020")
                .purchaseDate(LocalDate.now().minusDays(30))
                .customerSaleDate(LocalDate.now().minusDays(28))
                .purchasePrice(new BigDecimal("48000")).purchaseCurrency("SAR").build();

        CommodityMurabahaTrade trade2 = CommodityMurabahaTrade.builder()
                .id(21L).contractId(21L).tradeRef("TRD-021")
                .purchaseDate(LocalDate.now().minusDays(20))
                .customerSaleDate(LocalDate.now().minusDays(18))
                .purchasePrice(new BigDecimal("49000")).purchaseCurrency("SAR").build();

        CommodityMurabahaTrade trade3 = CommodityMurabahaTrade.builder()
                .id(22L).contractId(22L).tradeRef("TRD-022")
                .purchaseDate(LocalDate.now().minusDays(10))
                .customerSaleDate(LocalDate.now().minusDays(8))
                .purchasePrice(new BigDecimal("47500")).purchaseCurrency("SAR").build();

        when(murabahaContractRepository.findByCustomerId(customerId))
                .thenReturn(List.of(contract1, contract2, contract3));
        when(commodityMurabahaTradeRepository.findByContractId(20L)).thenReturn(Optional.of(trade1));
        when(commodityMurabahaTradeRepository.findByContractId(21L)).thenReturn(Optional.of(trade2));
        when(commodityMurabahaTradeRepository.findByContractId(22L)).thenReturn(Optional.of(trade3));
        when(ruleRepository.findByCategoryAndEnabledTrue(IslamicAmlRuleCategory.TAWARRUQ_ABUSE))
                .thenReturn(List.of());
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(alertRepository.save(any(IslamicAmlAlert.class))).thenAnswer(inv -> {
            IslamicAmlAlert a = inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        List<IslamicAmlAlertResponse> alerts = service.monitorTawarruqPatterns(customerId, 90);

        boolean hasStructuringAlert = alerts.stream()
                .anyMatch(a -> a.getIslamicContext() != null
                        && "TAWARRUQ_STRUCTURING".equals(a.getIslamicContext().get("pattern")));
        assertTrue(hasStructuringAlert,
                "Three trades with amounts just below CTR threshold should trigger structuring alert");
    }

    @Test
    @DisplayName("Alert statistics returns correct counts by status")
    void alertStatistics_correctCounts() {
        when(alertRepository.count()).thenReturn(10L);
        when(alertRepository.countByStatus(IslamicAmlAlertStatus.NEW)).thenReturn(3L);
        when(alertRepository.countByStatus(IslamicAmlAlertStatus.UNDER_INVESTIGATION)).thenReturn(2L);
        when(alertRepository.countByStatus(IslamicAmlAlertStatus.ESCALATED)).thenReturn(1L);
        when(alertRepository.countByStatus(IslamicAmlAlertStatus.SAR_FILED)).thenReturn(1L);
        when(alertRepository.countByStatus(IslamicAmlAlertStatus.CLOSED_NO_ACTION)).thenReturn(2L);
        when(alertRepository.countByStatus(IslamicAmlAlertStatus.CLOSED_FALSE_POSITIVE)).thenReturn(1L);
        when(alertRepository.findOverdueAlerts()).thenReturn(List.of());
        when(ruleRepository.findByCategory(any(IslamicAmlRuleCategory.class))).thenReturn(List.of());

        IslamicAmlAlertStatistics stats = service.getAlertStatistics();

        assertEquals(10L, stats.getTotalAlerts());
        assertEquals(3L, stats.getNewCount());
        assertEquals(2L, stats.getUnderInvestigation());
        assertEquals(1L, stats.getEscalated());
        assertEquals(1L, stats.getSarFiled());
        assertEquals(2L, stats.getClosedNoAction());
        assertEquals(1L, stats.getClosedFalsePositive());
        assertEquals(0L, stats.getOverdueCount());
    }
}
