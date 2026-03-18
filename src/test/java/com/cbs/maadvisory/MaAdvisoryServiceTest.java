package com.cbs.maadvisory;

import com.cbs.maadvisory.entity.MaEngagement;
import com.cbs.maadvisory.repository.MaEngagementRepository;
import com.cbs.maadvisory.service.MaAdvisoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaAdvisoryServiceTest {

    @Mock
    private MaEngagementRepository repository;

    @InjectMocks
    private MaAdvisoryService service;

    @Test
    @DisplayName("Close engagement calculates success fee = min(max(actualValue × pct, min), cap)")
    void closeEngagementCalculatesSuccessFee() {
        MaEngagement engagement = new MaEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("MA-TEST00001");
        engagement.setStatus("NEGOTIATION");
        engagement.setTotalFeesEarned(BigDecimal.ZERO);
        engagement.setSuccessFeePct(new BigDecimal("0.0200")); // 2%
        engagement.setSuccessFeeMin(new BigDecimal("500000.0000"));
        engagement.setSuccessFeeCap(new BigDecimal("2000000.0000"));

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(MaEngagement.class))).thenAnswer(i -> i.getArgument(0));

        // actualDealValue = 50,000,000 → 2% = 1,000,000 → max(1M, 500K) = 1M → min(1M, 2M) = 1M
        MaEngagement result = service.closeEngagement(1L, new BigDecimal("50000000"));

        assertThat(result.getStatus()).isEqualTo("CLOSED");
        assertThat(result.getActualDealValue()).isEqualByComparingTo(new BigDecimal("50000000"));
        assertThat(result.getTotalFeesEarned()).isEqualByComparingTo(new BigDecimal("1000000.0000"));
        assertThat(result.getClosingDate()).isNotNull();
    }

    @Test
    @DisplayName("Fee recording increments totalFeesEarned")
    void feeRecordingIncrementsTotalFeesEarned() {
        MaEngagement engagement = new MaEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("MA-TEST00002");
        engagement.setTotalFeesEarned(new BigDecimal("100000"));

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(MaEngagement.class))).thenAnswer(i -> i.getArgument(0));

        MaEngagement result = service.recordFee(1L, new BigDecimal("50000"));

        assertThat(result.getTotalFeesEarned()).isEqualByComparingTo(new BigDecimal("150000"));
    }

    @Test
    @DisplayName("Terminate sets TERMINATED status")
    void terminateSetsTerminatedStatus() {
        MaEngagement engagement = new MaEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("MA-TEST00003");
        engagement.setStatus("MANDATED");

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(MaEngagement.class))).thenAnswer(i -> i.getArgument(0));

        MaEngagement result = service.terminateEngagement(1L, "Client withdrew");

        assertThat(result.getStatus()).isEqualTo("TERMINATED");
    }
}
