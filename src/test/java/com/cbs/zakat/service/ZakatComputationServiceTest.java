package com.cbs.zakat.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.marketdata.service.MarketDataService;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.reports.dto.ReportDTOs;
import com.cbs.reports.service.ReportsService;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import com.cbs.zakat.dto.ZakatRequests;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatComputation;
import com.cbs.zakat.entity.ZakatComputationLineItem;
import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.entity.ZakatMethodology;
import com.cbs.zakat.repository.ZakatComputationLineItemRepository;
import com.cbs.zakat.repository.ZakatComputationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ZakatComputationServiceTest {

    @Mock
    private ZakatComputationRepository computationRepository;

    @Mock
    private ZakatComputationLineItemRepository lineItemRepository;

    @Mock
    private ZakatMethodologyService methodologyService;

    @Mock
    private ZakatClassificationService classificationService;

    @Mock
    private ReportsService reportsService;

    @Mock
    private HijriCalendarService hijriCalendarService;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private WadiahAccountRepository wadiahAccountRepository;

    @Mock
    private MudarabahAccountRepository mudarabahAccountRepository;

    @Mock
    private TransactionJournalRepository transactionJournalRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountPostingService accountPostingService;

    @Mock
    private IslamicPostingRuleService islamicPostingRuleService;

    @Mock
    private CurrentTenantResolver tenantResolver;

    @Mock
    private CurrentActorProvider currentActorProvider;

    @Mock
    private MarketDataService marketDataService;

    private ZakatComputationService service;

    @BeforeEach
    void setUp() {
        ZakatCalculationEngine engine = new ZakatCalculationEngine(marketDataService);
        ReflectionTestUtils.setField(engine, "fallbackGoldPricePerGramSar", new BigDecimal("320"));
        ReflectionTestUtils.setField(engine, "fallbackSilverPricePerGramSar", new BigDecimal("4"));
        ReflectionTestUtils.setField(engine, "fallbackFixedNisabSar", new BigDecimal("20000"));
        service = new ZakatComputationService(
                computationRepository,
                lineItemRepository,
                methodologyService,
                classificationService,
                engine,
                reportsService,
                hijriCalendarService,
                customerRepository,
                wadiahAccountRepository,
                mudarabahAccountRepository,
                transactionJournalRepository,
                accountRepository,
                accountPostingService,
                islamicPostingRuleService,
                tenantResolver,
                currentActorProvider
        );
    }

    @Test
    @DisplayName("Bank computation applies methodology overrides for IAH and PER/IRR")
    void computeBankZakatAppliesMethodologyOverrides() {
        ZakatMethodology methodology = ZakatMethodology.builder()
                .methodologyCode("ZKT-MTHD-KSA-STD")
                .description("Test")
                .zakatRateBasis(ZakatDomainEnums.ZakatRateBasis.HIJRI_YEAR)
                .classificationRuleSetCode("ZKT-MTHD-KSA-STD")
                .iahTreatment(ZakatDomainEnums.IahTreatment.NON_DEDUCTIBLE)
                .perIrrTreatment(ZakatDomainEnums.PerIrrTreatment.NON_DEDUCTIBLE)
                .ssbApproved(true)
                .build();

        List<ZakatResponses.ZakatClassificationResult> classifications = List.of(
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("1100-000-001")
                        .glAccountName("Cash")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("1000.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.ZAKATABLE_ASSET.name())
                        .subCategory("CASH")
                        .includedInZakatBase(true)
                        .build(),
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("2100-WAD-001")
                        .glAccountName("Wadiah")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("100.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.DEDUCTIBLE_LIABILITY.name())
                        .subCategory("WADIAH")
                        .includedInZakatBase(true)
                        .build(),
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("3100-MDR-001")
                        .glAccountName("UIA")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("200.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.DEDUCTIBLE_LIABILITY.name())
                        .subCategory("UIA")
                        .includedInZakatBase(true)
                        .build(),
                ZakatResponses.ZakatClassificationResult.builder()
                        .glAccountCode("3200-000-001")
                        .glAccountName("PER")
                        .currencyCode("SAR")
                        .adjustedAmount(new BigDecimal("50.00"))
                        .zakatClassification(ZakatDomainEnums.ZakatClassification.DEDUCTIBLE_LIABILITY.name())
                        .subCategory("PER")
                        .includedInZakatBase(true)
                        .build()
        );

        when(methodologyService.validateMethodologyApproved("ZKT-MTHD-KSA-STD")).thenReturn(methodology);
        when(hijriCalendarService.getZakatCalculationDate(1447)).thenReturn(LocalDate.of(2026, 3, 19));
        when(hijriCalendarService.getHijriYearStart(1447)).thenReturn(LocalDate.of(2025, 6, 26));
        when(hijriCalendarService.toHijri(any(LocalDate.class))).thenAnswer(invocation -> {
            LocalDate date = invocation.getArgument(0);
            return HijriDateResponse.builder()
                    .hijriDay(date.getDayOfMonth())
                    .hijriMonth(9)
                    .hijriMonthName("Ramadan")
                    .hijriYear(1447)
                    .gregorianDate(date)
                    .build();
        });
        when(classificationService.classifyAllAccounts("ZKT-MTHD-KSA-STD", LocalDate.of(2026, 3, 19))).thenReturn(classifications);
        when(reportsService.getBalanceSheet(LocalDate.of(2026, 3, 19))).thenReturn(ReportDTOs.BalanceSheet.builder()
                .totalAssets(new BigDecimal("1000.00"))
                .build());
        when(computationRepository.findByComputationTypeAndZakatYear(ZakatDomainEnums.ComputationType.BANK_ZAKAT, 1447))
                .thenReturn(Optional.empty());
        when(currentActorProvider.getCurrentActor()).thenReturn("tester");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(computationRepository.save(any(ZakatComputation.class))).thenAnswer(invocation -> {
            ZakatComputation computation = invocation.getArgument(0);
            if (computation.getId() == null) {
                computation.setId(UUID.randomUUID());
            }
            return computation;
        });
        doNothing().when(lineItemRepository).deleteByComputationId(any(UUID.class));
        when(lineItemRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ZakatComputation result = service.computeBankZakat(ZakatRequests.ComputeBankZakatRequest.builder()
                .zakatYear(1447)
                .methodologyCode("ZKT-MTHD-KSA-STD")
                .build());

        assertThat(result.getDeductibleLiabilities()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.getZakatBase()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(result.getAdjustedZakatAmount()).isEqualByComparingTo(new BigDecimal("25.00"));

                org.mockito.Mockito.verify(lineItemRepository).saveAll(argThat(items -> {
                        List<ZakatComputationLineItem> savedItems = new java.util.ArrayList<>();
                        items.forEach(savedItems::add);
                        return savedItems.stream()
                                        .anyMatch(item -> "2100-WAD-001".equals(item.getGlAccountCode())
                                                        && item.getCategory() == ZakatDomainEnums.ZakatClassification.NON_DEDUCTIBLE_LIABILITY);
                }));
    }
}