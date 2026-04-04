package com.cbs.gl.islamic;

import com.cbs.account.repository.AccountRepository;
import com.cbs.common.config.CbsProperties;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.islamic.dto.AaoifiBalanceSheet;
import com.cbs.gl.islamic.dto.CreateIslamicGLAccountRequest;
import com.cbs.gl.islamic.service.IslamicChartOfAccountsService;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.shariah.repository.FatwaRecordRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicChartOfAccountsServiceTest {

    @Mock private ChartOfAccountsRepository coaRepository;
    @Mock private GlBalanceRepository glBalanceRepository;
    @Mock private GeneralLedgerService generalLedgerService;
    @Mock private InvestmentPoolRepository investmentPoolRepository;
    @Mock private InvestmentPoolParticipantRepository participantRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private FatwaRecordRepository fatwaRecordRepository;
    @Mock private CurrentTenantResolver currentTenantResolver;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private IslamicChartOfAccountsService service;

    @BeforeEach
    void setUp() {
        CbsProperties.Deployment deployment = new CbsProperties.Deployment();
        deployment.setDefaultCurrency("USD");
        when(cbsProperties.getDeployment()).thenReturn(deployment);
    }

    @Test
    @DisplayName("create Islamic GL account with extension fields succeeds")
    void createIslamicGlAccount_success() {
        CreateIslamicGLAccountRequest request = CreateIslamicGLAccountRequest.builder()
                .glCode("1200-MRB-001")
                .glName("Murabaha Financing Receivable")
                .glCategory(GlCategory.ASSET)
                .normalBalance(NormalBalance.DEBIT)
                .islamicAccountCategory(IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA)
                .contractTypeCode("MURABAHA")
                .aaoifiReference("FAS 1")
                .zakatApplicable(true)
                .build();
        when(generalLedgerService.createGlAccount(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ChartOfAccounts created = service.createIslamicGLAccount(request);

        assertThat(created.getIsIslamicAccount()).isTrue();
        assertThat(created.getIslamicAccountCategory()).isEqualTo(IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA);
        assertThat(created.getContractTypeCode()).isEqualTo("MURABAHA");
        assertThat(created.getZakatApplicable()).isTrue();

        ArgumentCaptor<ChartOfAccounts> captor = ArgumentCaptor.forClass(ChartOfAccounts.class);
        verify(generalLedgerService).createGlAccount(captor.capture());
        assertThat(captor.getValue().getAaoifiReference()).isEqualTo("FAS 1");
    }

    @Test
    @DisplayName("filter accounts by Islamic category returns matches")
    void getAccountsByIslamicCategory_returnsMatches() {
        ChartOfAccounts murabaha = ChartOfAccounts.builder()
                .glCode("1200-MRB-001")
                .islamicAccountCategory(IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA)
                .build();
        when(coaRepository.findByIslamicAccountCategoryOrderByGlCodeAsc(IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA))
                .thenReturn(List.of(murabaha));

        List<ChartOfAccounts> result = service.getAccountsByIslamicCategory(IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA);

        assertThat(result).containsExactly(murabaha);
    }

    @Test
    @DisplayName("AAOIFI balance sheet aggregates sections and balances")
    void generateAaoifiBalanceSheet_balanced() {
        LocalDate asOfDate = LocalDate.of(2026, 1, 31);
        ChartOfAccounts cash = account("1100-000-001", GlCategory.ASSET, NormalBalance.DEBIT, IslamicAccountCategory.CASH_AND_EQUIVALENTS, "Cash");
        ChartOfAccounts wadiah = account("2100-WAD-001", GlCategory.LIABILITY, NormalBalance.CREDIT, IslamicAccountCategory.CURRENT_ACCOUNT_WADIAH, "Wadiah");
        ChartOfAccounts uia = account("3100-MDR-001", GlCategory.EQUITY, NormalBalance.CREDIT, IslamicAccountCategory.UNRESTRICTED_INVESTMENT_ACCOUNT, "UIA");
        ChartOfAccounts capital = account("4100-000-001", GlCategory.EQUITY, NormalBalance.CREDIT, IslamicAccountCategory.OWNERS_EQUITY, "Paid-up Capital");
        when(coaRepository.findByIsIslamicAccountTrueOrderByGlCodeAsc()).thenReturn(List.of(cash, wadiah, uia, capital));
        when(glBalanceRepository.findByGlCodeInAndBalanceDate(any(), eq(asOfDate))).thenReturn(List.of(
                balance("1100-000-001", new BigDecimal("100.00"), asOfDate),
                balance("2100-WAD-001", new BigDecimal("40.00"), asOfDate),
                balance("3100-MDR-001", new BigDecimal("30.00"), asOfDate),
                balance("4100-000-001", new BigDecimal("30.00"), asOfDate)
        ));
        when(investmentPoolRepository.findByPoolTypeAndStatus(any(), eq(PoolStatus.ACTIVE))).thenReturn(List.of());

        AaoifiBalanceSheet sheet = service.generateAaoifiBalanceSheet(asOfDate);

        assertThat(sheet.getAssets().getCashAndEquivalents()).isEqualByComparingTo("100.00");
        assertThat(sheet.getLiabilities().getCurrentAccountsWadiah()).isEqualByComparingTo("40.00");
        assertThat(sheet.getUnrestrictedInvestmentAccounts().getGrossBalance()).isEqualByComparingTo("30.00");
        assertThat(sheet.getOwnersEquity().getPaidUpCapital()).isEqualByComparingTo("30.00");
        assertThat(sheet.getIsBalanced()).isTrue();
    }

    private ChartOfAccounts account(String glCode, GlCategory category, NormalBalance normalBalance,
                                    IslamicAccountCategory islamicCategory, String name) {
        return ChartOfAccounts.builder()
                .glCode(glCode)
                .glName(name)
                .glCategory(category)
                .normalBalance(normalBalance)
                .isIslamicAccount(true)
                .isActive(true)
                .isPostable(true)
                .islamicAccountCategory(islamicCategory)
                .build();
    }

    private GlBalance balance(String glCode, BigDecimal amount, LocalDate date) {
        return GlBalance.builder()
                .glCode(glCode)
                .branchCode("HEAD")
                .currencyCode("USD")
                .balanceDate(date)
                .closingBalance(amount)
                .build();
    }
}
