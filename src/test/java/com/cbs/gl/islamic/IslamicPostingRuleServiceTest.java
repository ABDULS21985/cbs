package com.cbs.gl.islamic;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Customer;
import com.cbs.account.entity.Product;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.AccountResolutionType;
import com.cbs.gl.islamic.entity.AmountExpressionType;
import com.cbs.gl.islamic.entity.IslamicPostingEntryType;
import com.cbs.gl.islamic.entity.IslamicPostingRule;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.entity.PostingRuleEntry;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.IslamicPostingRuleRepository;
import com.cbs.gl.islamic.service.IslamicGLMetadataService;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.repository.ProductTemplateRepository;
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
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicPostingRuleServiceTest {

    @Mock private IslamicPostingRuleRepository postingRuleRepository;
    @Mock private IslamicGLMetadataService metadataService;
    @Mock private InvestmentPoolRepository investmentPoolRepository;
    @Mock private ProductTemplateRepository productTemplateRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private ChartOfAccountsRepository chartOfAccountsRepository;
    @Mock private GeneralLedgerService generalLedgerService;
    @Mock private CurrentActorProvider currentActorProvider;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private IslamicPostingRuleService service;

    @BeforeEach
    void setUp() {
        CbsProperties.Deployment deployment = new CbsProperties.Deployment();
        deployment.setDefaultCurrency("USD");
        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setDefaultBranchCode("HEAD");
        when(cbsProperties.getDeployment()).thenReturn(deployment);
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
    }

    @Test
    @DisplayName("resolve rule for Murabaha financing disbursement")
    void resolveRule_murabahaDisbursement() {
        IslamicPostingRule rule = rule("MRB-DISB-001", "MURABAHA", IslamicTransactionType.FINANCING_DISBURSEMENT, List.of());
        when(postingRuleRepository.findByTransactionTypeAndEnabledTrueAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(
                IslamicTransactionType.FINANCING_DISBURSEMENT, LocalDate.of(2026, 1, 31)))
                .thenReturn(List.of(rule));

        IslamicPostingRule resolved = service.resolveRule("MURABAHA", IslamicTransactionType.FINANCING_DISBURSEMENT,
                Map.of("transaction", IslamicPostingRequest.builder().valueDate(LocalDate.of(2026, 1, 31)).build(),
                        "valueDate", LocalDate.of(2026, 1, 31)));

        assertThat(resolved.getRuleCode()).isEqualTo("MRB-DISB-001");
    }

    @Test
    @DisplayName("generate journal entries for Murabaha disbursement")
    void generateJournalEntries_murabahaDisbursement() {
        IslamicPostingRule rule = rule("MRB-DISB-001", "MURABAHA", IslamicTransactionType.FINANCING_DISBURSEMENT, List.of(
                entry(IslamicPostingEntryType.DEBIT, AccountResolutionType.BY_CONTRACT_TYPE, IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA, null, AmountExpressionType.FULL_AMOUNT),
                entry(IslamicPostingEntryType.CREDIT, AccountResolutionType.FIXED, null, "1100-000-001", AmountExpressionType.PRINCIPAL),
                entry(IslamicPostingEntryType.CREDIT, AccountResolutionType.FIXED, null, "1200-MRB-002", AmountExpressionType.MARKUP)
        ));
        when(postingRuleRepository.findByTransactionTypeAndEnabledTrueAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(
                IslamicTransactionType.FINANCING_DISBURSEMENT, LocalDate.of(2026, 1, 31)))
                .thenReturn(List.of(rule));
        when(metadataService.resolveAccountByCategory(IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA, "USD"))
                .thenReturn("1200-MRB-001");
        when(chartOfAccountsRepository.findByGlCode("1100-000-001")).thenReturn(Optional.of(gl("1100-000-001")));
        when(chartOfAccountsRepository.findByGlCode("1200-MRB-002")).thenReturn(Optional.of(gl("1200-MRB-002")));

        JournalEntry preview = service.generateJournalEntries(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.FINANCING_DISBURSEMENT)
                .amount(new BigDecimal("100.00"))
                .principal(new BigDecimal("80.00"))
                .markup(new BigDecimal("20.00"))
                .valueDate(LocalDate.of(2026, 1, 31))
                .reference("MRB-001")
                .build());

        assertThat(preview.getLines()).hasSize(3);
        assertThat(preview.getLines().get(0).getGlCode()).isEqualTo("1200-MRB-001");
        assertThat(preview.getLines().get(0).getDebitAmount()).isEqualByComparingTo("100.00");
        assertThat(preview.getLines().get(1).getCreditAmount()).isEqualByComparingTo("80.00");
        assertThat(preview.getLines().get(2).getCreditAmount()).isEqualByComparingTo("20.00");
        verify(generalLedgerService, org.mockito.Mockito.never()).postJournal(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("late payment penalty credits charity fund and not income")
    void generateJournalEntries_latePenaltyToCharity() {
        IslamicPostingRule rule = rule("MRB-LATE-001", "MURABAHA", IslamicTransactionType.LATE_PAYMENT_PENALTY, List.of(
                PostingRuleEntry.builder()
                        .entryType(IslamicPostingEntryType.DEBIT)
                        .accountResolution(AccountResolutionType.BY_PARAMETER)
                        .accountParameter("customerAccountGlCode")
                        .amountExpression(AmountExpressionType.PENALTY)
                        .build(),
                PostingRuleEntry.builder()
                        .entryType(IslamicPostingEntryType.CREDIT)
                        .accountResolution(AccountResolutionType.FIXED)
                        .fixedAccountCode("2300-000-001")
                        .amountExpression(AmountExpressionType.PENALTY)
                        .build()
        ));
        when(postingRuleRepository.findByTransactionTypeAndEnabledTrueAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(
                IslamicTransactionType.LATE_PAYMENT_PENALTY, LocalDate.of(2026, 2, 1)))
                .thenReturn(List.of(rule));
        Account account = Account.builder()
                .id(1L)
                .customer(Customer.builder().id(99L).build())
                .product(Product.builder().glAccountCode("2100-WAD-001").build())
                .currencyCode("USD")
                .branchCode("HEAD")
                .build();
        when(accountRepository.findByIdWithProduct(1L)).thenReturn(Optional.of(account));
        when(chartOfAccountsRepository.findByGlCode("2300-000-001")).thenReturn(Optional.of(gl("2300-000-001")));

        JournalEntry preview = service.generateJournalEntries(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.LATE_PAYMENT_PENALTY)
                .amount(new BigDecimal("15.00"))
                .penalty(new BigDecimal("15.00"))
                .accountId(1L)
                .valueDate(LocalDate.of(2026, 2, 1))
                .build());

        assertThat(preview.getLines()).hasSize(2);
        assertThat(preview.getLines().get(1).getGlCode()).isEqualTo("2300-000-001");
    }

    @Test
    @DisplayName("account resolution by product reads GL mapping from product template")
    void generateJournalEntries_byProduct() {
        IslamicPostingRule rule = rule("PROD-001", "MURABAHA", IslamicTransactionType.FINANCING_DISBURSEMENT, List.of(
                entry(IslamicPostingEntryType.DEBIT, AccountResolutionType.BY_PRODUCT, IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA, null, AmountExpressionType.FULL_AMOUNT),
                entry(IslamicPostingEntryType.CREDIT, AccountResolutionType.FIXED, null, "1100-000-001", AmountExpressionType.FULL_AMOUNT)
        ));
        when(postingRuleRepository.findByTransactionTypeAndEnabledTrueAndEffectiveFromLessThanEqualOrderByPriorityDescRuleCodeAsc(
                IslamicTransactionType.FINANCING_DISBURSEMENT, LocalDate.of(2026, 3, 1)))
                .thenReturn(List.of(rule));
        ProductTemplate template = ProductTemplate.builder()
                .id(10L)
                .glMapping(Map.of("financingAssetGl", "1200-MRB-001"))
                .build();
        when(productTemplateRepository.findById(10L)).thenReturn(Optional.of(template));
        when(chartOfAccountsRepository.findByGlCode("1100-000-001")).thenReturn(Optional.of(gl("1100-000-001")));

        JournalEntry preview = service.generateJournalEntries(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.FINANCING_DISBURSEMENT)
                .productId(10L)
                .amount(new BigDecimal("50.00"))
                .valueDate(LocalDate.of(2026, 3, 1))
                .build());

        assertThat(preview.getLines().get(0).getGlCode()).isEqualTo("1200-MRB-001");
    }

    private IslamicPostingRule rule(String code, String contract, IslamicTransactionType txnType, List<PostingRuleEntry> entries) {
        return IslamicPostingRule.builder()
                .ruleCode(code)
                .name(code)
                .contractTypeCode(contract)
                .transactionType(txnType)
                .entries(entries)
                .enabled(true)
                .effectiveFrom(LocalDate.of(2024, 1, 1))
                .priority(100)
                .build();
    }

    private PostingRuleEntry entry(IslamicPostingEntryType entryType, AccountResolutionType resolution,
                                   IslamicAccountCategory category, String fixedAccountCode, AmountExpressionType amountExpression) {
        return PostingRuleEntry.builder()
                .entryType(entryType)
                .accountResolution(resolution)
                .accountCategory(category)
                .fixedAccountCode(fixedAccountCode)
                .amountExpression(amountExpression)
                .build();
    }

    private ChartOfAccounts gl(String code) {
        return ChartOfAccounts.builder()
                .glCode(code)
                .glCategory(GlCategory.ASSET)
                .normalBalance(NormalBalance.DEBIT)
                .build();
    }
}
