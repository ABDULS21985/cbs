package com.cbs.gl.islamic;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.islamic.dto.PerCalculationResult;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.entity.PerPolicy;
import com.cbs.gl.islamic.entity.PerRetentionAllocation;
import com.cbs.gl.islamic.entity.PerTransaction;
import com.cbs.gl.islamic.entity.ReservePolicyStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.repository.PerPolicyRepository;
import com.cbs.gl.islamic.repository.PerTransactionRepository;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.gl.islamic.service.PerService;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.shariah.repository.FatwaRecordRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PerServiceTest {

    @Mock private PerPolicyRepository perPolicyRepository;
    @Mock private PerTransactionRepository perTransactionRepository;
    @Mock private InvestmentPoolRepository investmentPoolRepository;
    @Mock private InvestmentPoolParticipantRepository participantRepository;
    @Mock private FatwaRecordRepository fatwaRecordRepository;
    @Mock private GlBalanceRepository glBalanceRepository;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private PerService service;

    private InvestmentPool pool;
    private PerPolicy policy;

    @BeforeEach
    void setUp() {
        pool = InvestmentPool.builder()
                .id(1L)
                .poolCode("POOL1")
                .profitSharingRatioBank(new BigDecimal("40.0000"))
                .profitSharingRatioInvestors(new BigDecimal("60.0000"))
                .build();
        policy = PerPolicy.builder()
                .id(10L)
                .investmentPoolId(1L)
                .status(ReservePolicyStatus.ACTIVE)
                .retentionRate(new BigDecimal("10.0000"))
                .maximumRetentionRate(new BigDecimal("15.0000"))
                .releaseThreshold(new BigDecimal("10.0000"))
                .targetDistributionRate(new BigDecimal("10.0000"))
                .maximumReserveBalance(new BigDecimal("50.00"))
                .retentionAllocation(PerRetentionAllocation.FROM_GROSS_BEFORE_SPLIT)
                .build();
        when(perPolicyRepository.findByInvestmentPoolId(1L)).thenReturn(Optional.of(policy));
        when(investmentPoolRepository.findById(1L)).thenReturn(Optional.of(pool));
        when(participantRepository.sumParticipationBalanceByPoolId(1L)).thenReturn(new BigDecimal("1000.00"));
        when(currentActorProvider.getCurrentActor()).thenReturn("tester");
    }

    @Test
    @DisplayName("actual rate above target retains into PER and respects caps")
    void calculatePerAdjustment_retention() {
        when(perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L)).thenReturn(Optional.empty());

        PerCalculationResult result = service.calculatePerAdjustment(1L, new BigDecimal("300.00"),
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertThat(result.getAdjustmentType()).isEqualTo("RETENTION");
        assertThat(result.getAdjustmentAmount()).isEqualByComparingTo("20.00");
        assertThat(result.getDistributedProfit()).isEqualByComparingTo("280.00");
        assertThat(result.getPerBalanceAfter()).isEqualByComparingTo("20.00");
    }

    @Test
    @DisplayName("actual rate below target releases from PER up to available balance")
    void calculatePerAdjustment_release() {
        when(perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L))
                .thenReturn(Optional.of(PerTransaction.builder().balanceAfter(new BigDecimal("20.00")).build()));

        PerCalculationResult result = service.calculatePerAdjustment(1L, new BigDecimal("20.00"),
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28));

        assertThat(result.getAdjustmentType()).isEqualTo("RELEASE");
        assertThat(result.getAdjustmentAmount()).isEqualByComparingTo("20.00");
        assertThat(result.getPerBalanceAfter()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("actual rate equal to target produces no PER adjustment")
    void calculatePerAdjustment_noMovement() {
        when(perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L)).thenReturn(Optional.empty());

        PerCalculationResult result = service.calculatePerAdjustment(1L, new BigDecimal("100.00"),
                LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 31));

        assertThat(result.getAdjustmentType()).isEqualTo("NONE");
        assertThat(result.getAdjustmentAmount()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("retention allocation from gross and bank share produce different outcomes")
    void calculatePerAdjustment_differentAllocations() {
        when(perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L)).thenReturn(Optional.empty());
        PerCalculationResult fromGross = service.calculatePerAdjustment(1L, new BigDecimal("300.00"),
                LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 30));

        policy.setRetentionAllocation(PerRetentionAllocation.FROM_BANK_SHARE_ONLY);
        PerCalculationResult fromBankShare = service.calculatePerAdjustment(1L, new BigDecimal("300.00"),
                LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 30));

        assertThat(fromGross.getAdjustmentAmount()).isGreaterThan(fromBankShare.getAdjustmentAmount());
        assertThat(fromBankShare.getAdjustmentAmount()).isEqualByComparingTo("8.00");
    }

    @Test
    @DisplayName("retain to PER posts a journal and stores running balance")
    void retainToPer_postsJournal() {
        when(perTransactionRepository.findTopByPoolIdOrderByProcessedAtDesc(1L)).thenReturn(Optional.empty());
        when(postingRuleService.postIslamicTransaction(any()))
                .thenReturn(JournalEntry.builder().journalNumber("JN0001").build());

        service.retainToPer(1L, new BigDecimal("10.00"), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31),
                new BigDecimal("300.00"), new BigDecimal("30.0000"), new BigDecimal("28.0000"));

        verify(postingRuleService).postIslamicTransaction(any());
        ArgumentCaptor<PerTransaction> captor = ArgumentCaptor.forClass(PerTransaction.class);
        verify(perTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getJournalRef()).isEqualTo("JN0001");
        assertThat(captor.getValue().getBalanceAfter()).isEqualByComparingTo("10.00");
    }
}
