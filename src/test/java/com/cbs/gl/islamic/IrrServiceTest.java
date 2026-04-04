package com.cbs.gl.islamic;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.islamic.dto.IrrAdequacyReport;
import com.cbs.gl.islamic.dto.IrrReleaseResult;
import com.cbs.gl.islamic.dto.IrrRetentionResult;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.IrrPolicy;
import com.cbs.gl.islamic.entity.IrrRetentionAllocation;
import com.cbs.gl.islamic.entity.IrrTransaction;
import com.cbs.gl.islamic.entity.ReservePolicyStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.IrrPolicyRepository;
import com.cbs.gl.islamic.repository.IrrTransactionRepository;
import com.cbs.gl.islamic.service.IrrService;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.shariah.repository.FatwaRecordRepository;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IrrServiceTest {

    @Mock private IrrPolicyRepository irrPolicyRepository;
    @Mock private IrrTransactionRepository irrTransactionRepository;
    @Mock private InvestmentPoolRepository investmentPoolRepository;
    @Mock private InvestmentPoolParticipantRepository participantRepository;
    @Mock private FatwaRecordRepository fatwaRecordRepository;
    @Mock private ChartOfAccountsRepository chartOfAccountsRepository;
    @Mock private GlBalanceRepository glBalanceRepository;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private IrrService service;

    private InvestmentPool pool;
    private IrrPolicy policy;

    @BeforeEach
    void setUp() {
        pool = InvestmentPool.builder()
                .id(1L)
                .poolCode("POOL1")
                .profitSharingRatioBank(new BigDecimal("40.0000"))
                .profitSharingRatioInvestors(new BigDecimal("60.0000"))
                .build();
        policy = IrrPolicy.builder()
                .id(20L)
                .investmentPoolId(1L)
                .status(ReservePolicyStatus.ACTIVE)
                .retentionRate(new BigDecimal("5.0000"))
                .maximumRetentionRate(new BigDecimal("10.0000"))
                .maximumReserveBalance(new BigDecimal("100.00"))
                .triggerThreshold(new BigDecimal("1.0000"))
                .retentionAllocation(IrrRetentionAllocation.FROM_INVESTOR_SHARE_ONLY)
                .build();
        when(irrPolicyRepository.findByInvestmentPoolId(1L)).thenReturn(Optional.of(policy));
        when(investmentPoolRepository.findById(1L)).thenReturn(Optional.of(pool));
        when(participantRepository.sumParticipationBalanceByPoolId(1L)).thenReturn(new BigDecimal("1000.00"));
    }

    @Test
    @DisplayName("IRR retention is calculated from distributable profit after PER")
    void calculateIrrRetention() {
        when(irrTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L)).thenReturn(Optional.empty());

        IrrRetentionResult result = service.calculateIrrRetention(1L, new BigDecimal("100.00"),
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertThat(result.getAdjustmentAmount()).isEqualByComparingTo("3.00");
        assertThat(result.getDistributableProfitAfterRetention()).isEqualByComparingTo("97.00");
    }

    @Test
    @DisplayName("IRR release absorbs full loss when reserve is sufficient")
    void calculateIrrRelease_fullCoverage() {
        when(irrTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L))
                .thenReturn(Optional.of(IrrTransaction.builder().balanceAfter(new BigDecimal("50.00")).build()));

        IrrReleaseResult result = service.calculateIrrRelease(1L, new BigDecimal("20.00"));

        assertThat(result.getTriggered()).isTrue();
        assertThat(result.getAbsorbed()).isEqualByComparingTo("20.00");
        assertThat(result.getRemainingLoss()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("IRR release is partial when reserve is insufficient")
    void calculateIrrRelease_partialCoverage() {
        when(irrTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L))
                .thenReturn(Optional.of(IrrTransaction.builder().balanceAfter(new BigDecimal("15.00")).build()));

        IrrReleaseResult result = service.calculateIrrRelease(1L, new BigDecimal("20.00"));

        assertThat(result.getAbsorbed()).isEqualByComparingTo("15.00");
        assertThat(result.getRemainingLoss()).isEqualByComparingTo("5.00");
    }

    @Test
    @DisplayName("IRR adequacy report uses impairment balance as ECL proxy")
    void getIrrAdequacy() {
        when(irrTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L))
                .thenReturn(Optional.of(IrrTransaction.builder().balanceAfter(new BigDecimal("10.00")).build()));
        ChartOfAccounts impairment = ChartOfAccounts.builder()
                .glCode("6300-000-001")
                .glCategory(GlCategory.EXPENSE)
                .islamicAccountCategory(IslamicAccountCategory.FINANCING_IMPAIRMENT)
                .build();
        when(chartOfAccountsRepository.findByIslamicAccountCategoryOrderByGlCodeAsc(IslamicAccountCategory.FINANCING_IMPAIRMENT))
                .thenReturn(List.of(impairment));
        when(glBalanceRepository.findByGlCodeAndBalanceDate("6300-000-001", LocalDate.now()))
                .thenReturn(List.of(GlBalance.builder().glCode("6300-000-001").closingBalance(new BigDecimal("20.00")).build()));

        IrrAdequacyReport report = service.getIrrAdequacy(1L);

        assertThat(report.getCoverageRatio()).isEqualByComparingTo("0.5000");
    }
}
