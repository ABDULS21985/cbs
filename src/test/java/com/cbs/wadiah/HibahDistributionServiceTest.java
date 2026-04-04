package com.cbs.wadiah;

import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.mudarabah.entity.RiskLevel;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.dto.HibahPatternAnalysis;
import com.cbs.wadiah.entity.HibahDistributionBatch;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.repository.HibahDistributionBatchRepository;
import com.cbs.wadiah.repository.HibahDistributionItemRepository;
import com.cbs.wadiah.repository.HibahPolicyRepository;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import com.cbs.wadiah.service.HibahDistributionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HibahDistributionServiceTest {

    @Mock private HibahPolicyRepository hibahPolicyRepository;
    @Mock private HibahDistributionBatchRepository hibahDistributionBatchRepository;
    @Mock private HibahDistributionItemRepository hibahDistributionItemRepository;
    @Mock private WadiahAccountRepository wadiahAccountRepository;
    @Mock private TransactionJournalRepository transactionJournalRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private DecisionTableEvaluator decisionTableEvaluator;
    @Mock private CurrentTenantResolver currentTenantResolver;

    @InjectMocks
    private HibahDistributionService hibahDistributionService;

    @Test
    void analyzeHibahPatterns_flagsHighlySystematicDistributions() {
        when(hibahDistributionBatchRepository.findAll()).thenReturn(List.of(
                batch(LocalDate.now().minusDays(360), "0.2500"),
                batch(LocalDate.now().minusDays(270), "0.2501"),
                batch(LocalDate.now().minusDays(180), "0.2502"),
                batch(LocalDate.now().minusDays(90), "0.2501")
        ));

        HibahPatternAnalysis analysis = hibahDistributionService.analyzeHibahPatterns(null);

        assertThat(analysis.isFrequencyRegular()).isTrue();
        assertThat(analysis.isRateStable()).isTrue();
        assertThat(analysis.getSystematicRisk()).isEqualTo(RiskLevel.HIGH);
        assertThat(analysis.getAlerts()).isNotEmpty();
    }

    private HibahDistributionBatch batch(LocalDate distributionDate, String rate) {
        return HibahDistributionBatch.builder()
                .id(distributionDate.toEpochDay())
                .batchRef("HIB-" + distributionDate)
                .distributionDate(distributionDate)
                .periodFrom(distributionDate.minusMonths(3))
                .periodTo(distributionDate)
                .averageHibahRate(new BigDecimal(rate))
                .status(WadiahDomainEnums.HibahBatchStatus.COMPLETED)
                .createdAt(Instant.now())
                .build();
    }
}
