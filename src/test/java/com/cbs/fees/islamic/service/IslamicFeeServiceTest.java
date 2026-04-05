package com.cbs.fees.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.fees.entity.FeeChargeLog;
import com.cbs.fees.repository.FeeChargeLogRepository;
import com.cbs.fees.repository.FeeDefinitionRepository;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.entity.IslamicFeeWaiver;
import com.cbs.fees.islamic.repository.IslamicFeeConfigurationRepository;
import com.cbs.fees.islamic.repository.IslamicFeeWaiverRepository;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.service.CharityFundService;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.springframework.beans.factory.ObjectProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IslamicFeeServiceTest {

    @Mock private IslamicFeeConfigurationRepository configRepository;
    @Mock private FeeDefinitionRepository feeDefinitionRepository;
    @Mock private FeeChargeLogRepository feeChargeLogRepository;
    @Mock private IslamicFeeWaiverRepository waiverRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private ProductRepository productRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private ShariahScreeningService shariahScreeningService;
    @Mock private CharityFundService charityFundService;
    @Mock private DecisionTableEvaluator decisionTableEvaluator;
    @Mock private CurrentActorProvider actorProvider;
    @Mock private CurrentTenantResolver tenantResolver;
    @Mock private ObjectProvider<LatePenaltyService> latePenaltyServiceProvider;

    @InjectMocks private IslamicFeeService service;

    private Account account;

    @BeforeEach
    void setUp() {
        account = Account.builder()
                .id(10L)
                .accountNumber("00010001")
                .accountName("Islamic Financing Account")
                .currencyCode("SAR")
                .customer(Customer.builder()
                        .id(99L)
                        .cifNumber("CIF-99")
                        .customerType(CustomerType.INDIVIDUAL)
                        .status(CustomerStatus.ACTIVE)
                        .build())
                .build();
        when(accountRepository.findByIdWithProduct(10L)).thenReturn(Optional.of(account));
        when(actorProvider.getCurrentActor()).thenReturn("tester");
        when(tenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(waiverRepository.findApplicablePreChargeWaivers(any(), any(), any(), any())).thenReturn(List.of());
        when(shariahScreeningService.preScreenTransaction(any())).thenReturn(
                ShariahScreeningResultResponse.builder().actionTaken(ScreeningActionTaken.ALLOWED).build());
        doNothing().when(shariahScreeningService).ensureAllowed(any());
        when(accountPostingService.balanceLeg(anyString(), any(), any(BigDecimal.class), anyString(), any(BigDecimal.class),
                anyString(), any(), any()))
                .thenAnswer(invocation -> new AccountPostingService.GlPostingLeg(
                        invocation.getArgument(0),
                        invocation.getArgument(1),
                        invocation.getArgument(2),
                        invocation.getArgument(3),
                        invocation.getArgument(4),
                        invocation.getArgument(5),
                        invocation.getArgument(6),
                        invocation.getArgument(7),
                        "HEAD"));
        when(accountPostingService.postDebitAgainstGl(
                any(Account.class),
                eq(TransactionType.FEE_DEBIT),
                any(BigDecimal.class),
                anyString(),
                eq(TransactionChannel.SYSTEM),
                anyString(),
                anyList(),
                eq("ISLAMIC_FEE_ENGINE"),
                anyString()))
                .thenReturn(completedJournal("JRN-100"));
        when(feeChargeLogRepository.save(any(FeeChargeLog.class))).thenAnswer(invocation -> {
            FeeChargeLog log = invocation.getArgument(0);
            log.setId(77L);
            return log;
        });
    }

    @Test
    @DisplayName("charge fee routes Ujrah fee to bank income GL and keeps charity routing off")
    void chargeFee_routesUjrahToIncomeGl() {
        IslamicFeeConfiguration configuration = activeFlatFee("IJR-FEE-DOC-001", "UJRAH_PERMISSIBLE", false);
        configuration.setIncomeGlAccount("5500-FEE-001");
        configuration.setFlatAmount(new BigDecimal("500.00"));
        when(configRepository.findByFeeCode("IJR-FEE-DOC-001")).thenReturn(Optional.of(configuration));

        IslamicFeeResponses.FeeChargeResult result = service.chargeFee(IslamicFeeRequests.ChargeFeeRequest.builder()
                .feeCode("IJR-FEE-DOC-001")
                .accountId(10L)
                .transactionAmount(new BigDecimal("50000.00"))
                .currencyCode("SAR")
                .customerId(99L)
                .build());

        assertThat(result.isCharityRouted()).isFalse();
        assertThat(result.getChargedAmount()).isEqualByComparingTo("500.00");
        assertThat(result.getGlAccountCode()).isEqualTo("5500-FEE-001");
        verify(charityFundService, never()).recordPenaltyInflow(anyString(), any(), anyString(), anyString(), any(), anyString());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AccountPostingService.GlPostingLeg>> legsCaptor = ArgumentCaptor.forClass(List.class);
        verify(accountPostingService).postDebitAgainstGl(
                eq(account),
                eq(TransactionType.FEE_DEBIT),
                eq(new BigDecimal("500.00")),
                anyString(),
                eq(TransactionChannel.SYSTEM),
                anyString(),
                legsCaptor.capture(),
                eq("ISLAMIC_FEE_ENGINE"),
                anyString());
        assertThat(legsCaptor.getValue()).hasSize(1);
        assertThat(legsCaptor.getValue().get(0).glCode()).isEqualTo("5500-FEE-001");
    }

    @Test
    @DisplayName("charge fee routes penalty fee to charity fund ledger")
    void chargeFee_routesPenaltyToCharityFund() {
        IslamicFeeConfiguration configuration = activeFlatFee("GEN-FEE-LATE-001", "PENALTY_CHARITY", true);
        configuration.setCharityGlAccount("2300-000-001");
        configuration.setFlatAmount(new BigDecimal("200.00"));
        when(configRepository.findByFeeCode("GEN-FEE-LATE-001")).thenReturn(Optional.of(configuration));
        when(charityFundService.recordPenaltyInflow(anyString(), eq(new BigDecimal("200.00")), eq("MRB-001"), eq("MURABAHA"), eq(99L), eq("JRN-100"), eq("SAR")))
                .thenReturn(com.cbs.shariahcompliance.entity.CharityFundLedgerEntry.builder().id(501L).build());

        IslamicFeeResponses.FeeChargeResult result = service.chargeFee(IslamicFeeRequests.ChargeFeeRequest.builder()
                .feeCode("GEN-FEE-LATE-001")
                .accountId(10L)
                .transactionAmount(new BigDecimal("1000.00"))
                .contractRef("MRB-001")
                .contractTypeCode("MURABAHA")
                .triggerRef("MRB-001-LATE-1")
                .customerId(99L)
                .currencyCode("SAR")
                .build());

        assertThat(result.isCharityRouted()).isTrue();
        assertThat(result.getGlAccountCode()).isEqualTo("2300-000-001");
        assertThat(result.getCharityFundEntryId()).isEqualTo(501L);
        verify(charityFundService).recordPenaltyInflow("GEN-FEE-LATE-001:MRB-001-LATE-1",
                new BigDecimal("200.00"), "MRB-001", "MURABAHA", 99L, "JRN-100", "SAR");
    }

    @Test
    @DisplayName("calculate fee caps percentage amount by anti-riba financing limit")
    void calculateFee_capsByAntiRibaFinancingLimit() {
        IslamicFeeConfiguration configuration = activeFlatFee("MRB-FEE-PROC-001", "UJRAH_COST_RECOVERY", false);
        configuration.setFeeType("PERCENTAGE");
        configuration.setPercentageRate(new BigDecimal("2.0000"));
        configuration.setPercentageOfFinancingProhibited(true);
        configuration.setMaximumAsPercentOfFinancing(new BigDecimal("1.0000"));
        configuration.setFlatAmount(null);
        when(configRepository.findById(1L)).thenReturn(Optional.of(configuration));

        IslamicFeeResponses.FeeCalculationResult result = service.calculateFee(1L,
                IslamicFeeResponses.FeeCalculationContext.builder()
                        .transactionAmount(new BigDecimal("200000.00"))
                        .financingAmount(new BigDecimal("100000.00"))
                        .currencyCode("SAR")
                        .build());

        assertThat(result.getCalculatedAmount()).isEqualByComparingTo("1000.00");
        assertThat(result.isAntiRibaCheckPassed()).isFalse();
        assertThat(result.getAntiRibaNote()).contains("1.0000% of financing amount");
    }

    @Test
    @DisplayName("charge fee rejects unapproved fee configuration")
    void chargeFee_rejectsPendingSsbApproval() {
        IslamicFeeConfiguration configuration = activeFlatFee("GEN-FEE-STMT-001", "UJRAH_COST_RECOVERY", false);
        configuration.setStatus("PENDING_SSB_APPROVAL");
        configuration.setSsbApproved(false);
        when(configRepository.findByFeeCode("GEN-FEE-STMT-001")).thenReturn(Optional.of(configuration));

        assertThatThrownBy(() -> service.chargeFee(IslamicFeeRequests.ChargeFeeRequest.builder()
                .feeCode("GEN-FEE-STMT-001")
                .accountId(10L)
                .transactionAmount(new BigDecimal("15.00"))
                .currencyCode("SAR")
                .build()))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo("ISLAMIC_FEE_PENDING_SSB");
    }

    @Test
    @DisplayName("charge fee suppresses applied pre-charge deferral until deferred date")
    void chargeFee_suppressesAppliedPreChargeDeferral() {
        IslamicFeeConfiguration configuration = activeFlatFee("GEN-FEE-MAINT-001", "UJRAH_PERMISSIBLE", false);
        configuration.setFeeCategory("ACCOUNT_MAINTENANCE");
        configuration.setChargeFrequency("MONTHLY");
        configuration.setChargeTiming("PERIODIC");
        when(configRepository.findByFeeCode("GEN-FEE-MAINT-001")).thenReturn(Optional.of(configuration));
        when(waiverRepository.findApplicablePreChargeWaivers(eq(1L), eq(10L), eq(500L), eq(99L))).thenReturn(List.of(
                IslamicFeeWaiver.builder()
                        .id(900L)
                        .feeConfigId(1L)
                        .accountId(10L)
                        .contractId(500L)
                        .customerId(99L)
                        .waiverType("DEFERRAL")
                        .status("APPLIED")
                        .deferredUntil(LocalDate.now().plusDays(5))
                        .build()));

        IslamicFeeResponses.FeeChargeResult result = service.chargeFee(IslamicFeeRequests.ChargeFeeRequest.builder()
                .feeCode("GEN-FEE-MAINT-001")
                .accountId(10L)
                .contractId(500L)
                .transactionAmount(new BigDecimal("100.00"))
                .currencyCode("SAR")
                .customerId(99L)
                .build());

        assertThat(result.getChargedAmount()).isEqualByComparingTo("0.00");
        assertThat(result.getMessage()).contains("Fee deferred until");
        verify(accountPostingService, never()).postDebitAgainstGl(any(), any(), any(), anyString(), any(), anyString(), anyList(), anyString(), anyString());
    }

    @Test
    @DisplayName("create fee rejects percentage configuration without maximum cap")
    void createFee_rejectsPercentageWithoutCap() {
        assertThatThrownBy(() -> service.createFee(IslamicFeeRequests.SaveIslamicFeeRequest.builder()
                .feeCode("MRB-FEE-PROC-002")
                .name("Processing Fee")
                .shariahClassification("UJRAH_COST_RECOVERY")
                .shariahJustification("Actual processing effort")
                .ssbApproved(true)
                .feeType("PERCENTAGE")
                .percentageRate(new BigDecimal("1.00"))
                .feeCategory("PROCESSING")
                .chargeFrequency("ONE_TIME")
                .chargeTiming("AT_DISBURSEMENT")
                .incomeGlAccount("5500-FEE-001")
                .charityRouted(false)
                .percentageOfFinancingProhibited(true)
                .compoundingProhibited(true)
                .maximumAsPercentOfFinancing(new BigDecimal("1.00"))
                .effectiveFrom(LocalDate.now())
                .build()))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo("ISLAMIC_FEE_PERCENTAGE_CAP_REQUIRED");
    }

    @Test
    @DisplayName("product fee schedule returns applicable fees with Shariah metadata")
    void getProductFeeSchedule_returnsApplicableFees() {
        IslamicFeeConfiguration docFee = activeFlatFee("MRB-FEE-DOC-001", "UJRAH_PERMISSIBLE", false);
        docFee.setApplicableContractTypes(List.of("MURABAHA"));
        docFee.setApplicableProductCodes(List.of("MRB-HOME"));
        docFee.setName("Murabaha Documentation Fee");
        docFee.setChargeFrequency("ONE_TIME");
        docFee.setChargeTiming("AT_INCEPTION");
        docFee.setShariahJustification("Fee for documentation work");

        IslamicFeeConfiguration lateFee = activeFlatFee("GEN-FEE-LATE-001", "PENALTY_CHARITY", true);
        lateFee.setApplicableContractTypes(List.of("ALL"));
        lateFee.setApplicableProductCodes(List.of());
        lateFee.setName("Late Payment Charge");
        lateFee.setChargeFrequency("ON_EVENT");
        lateFee.setChargeTiming("AT_EVENT");

        when(configRepository.findAll()).thenReturn(List.of(docFee, lateFee));
        when(productRepository.findByCode("MRB-HOME")).thenReturn(Optional.of(
                com.cbs.account.entity.Product.builder().code("MRB-HOME").name("Murabaha Home").build()));
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("MRB-HOME")).thenReturn(Optional.of(
                IslamicProductTemplate.builder()
                        .productCode("MRB-HOME")
                        .contractType(IslamicContractType.builder()
                                .code("MURABAHA")
                                .category(IslamicDomainEnums.ContractCategory.SALE_BASED)
                                .accountingTreatment(IslamicDomainEnums.AccountingTreatment.AMORTISED_COST)
                                .build())
                        .build()));

        IslamicFeeResponses.ProductFeeSchedule schedule = service.getProductFeeSchedule("MRB-HOME");

        assertThat(schedule.getFees()).hasSize(2);
        assertThat(schedule.getFees()).extracting(IslamicFeeResponses.ProductFeeSchedule.FeeScheduleEntry::getFeeCode)
                .containsExactlyInAnyOrder("MRB-FEE-DOC-001", "GEN-FEE-LATE-001");
        assertThat(schedule.getFees()).anySatisfy(entry -> {
            assertThat(entry.getFeeCode()).isEqualTo("GEN-FEE-LATE-001");
            assertThat(entry.isCharityRouted()).isTrue();
            assertThat(entry.getShariahClassification()).isEqualTo("PENALTY_CHARITY");
        });
    }

    private IslamicFeeConfiguration activeFlatFee(String feeCode, String classification, boolean charityRouted) {
        return IslamicFeeConfiguration.builder()
                .id(1L)
                .feeCode(feeCode)
                .name(feeCode)
                .description("Fee")
                .shariahClassification(classification)
                .shariahJustification("Permissible service fee")
                .ssbApproved(true)
                .feeType("FLAT")
                .flatAmount(new BigDecimal("10.00"))
                .feeCategory("DOCUMENTATION")
                .chargeFrequency("ONE_TIME")
                .chargeTiming("AT_INCEPTION")
                .charityRouted(charityRouted)
                .incomeGlAccount("5500-FEE-001")
                .charityGlAccount(charityRouted ? "2300-000-001" : null)
                .percentageOfFinancingProhibited(false)
                .compoundingProhibited(true)
                .status("ACTIVE")
                .effectiveFrom(LocalDate.now().minusDays(1))
                .effectiveTo(LocalDate.now().plusDays(30))
                .applicableContractTypes(List.of("ALL"))
                .build();
    }

    private com.cbs.account.entity.TransactionJournal completedJournal(String journalNumber) {
        return com.cbs.account.entity.TransactionJournal.builder()
                .transactionRef("TXN-1")
                .account(account)
                .transactionType(TransactionType.FEE_DEBIT)
                .amount(new BigDecimal("500.00"))
                .currencyCode("SAR")
                .runningBalance(BigDecimal.ZERO)
                .narration("Fee")
                .journal(JournalEntry.builder()
                        .journalNumber(journalNumber)
                        .journalType("SYSTEM")
                        .description("Fee")
                        .createdBy("tester")
                        .build())
                .build();
    }
}
