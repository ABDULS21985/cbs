package com.cbs.marketmaking;

import com.cbs.marketmaking.entity.MarketMakingActivity;
import com.cbs.marketmaking.entity.MarketMakingMandate;
import com.cbs.marketmaking.repository.MarketMakingActivityRepository;
import com.cbs.marketmaking.repository.MarketMakingMandateRepository;
import com.cbs.marketmaking.service.MarketMakingService;
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
class MarketMakingServiceTest {

    @Mock
    private MarketMakingMandateRepository mandateRepository;

    @Mock
    private MarketMakingActivityRepository activityRepository;

    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks
    private MarketMakingService service;

    @Test
    @DisplayName("fillRatioPct calculated as quotesHit / quotesPublished × 100")
    void fillRatioPctCalculated() {
        MarketMakingMandate mandate = new MarketMakingMandate();
        mandate.setId(1L);
        mandate.setMandateCode("MM-TEST00001");

        MarketMakingActivity activity = new MarketMakingActivity();
        activity.setQuotesPublished(200);
        activity.setQuotesHit(50);

        when(mandateRepository.findByMandateCode("MM-TEST00001")).thenReturn(Optional.of(mandate));
        when(activityRepository.save(any(MarketMakingActivity.class))).thenAnswer(i -> i.getArgument(0));

        MarketMakingActivity result = service.recordDailyActivity("MM-TEST00001", activity);

        // 50 / 200 × 100 = 25.00
        assertThat(result.getFillRatioPct()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(result.getMandateId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Obligation met flag preserved from activity input")
    void obligationMetPreserved() {
        MarketMakingMandate mandate = new MarketMakingMandate();
        mandate.setId(1L);
        mandate.setMandateCode("MM-TEST00002");
        mandate.setDailyQuoteHours(8);

        MarketMakingActivity activity = new MarketMakingActivity();
        activity.setQuotesPublished(100);
        activity.setQuotesHit(80);
        activity.setQuotingUptimePct(new BigDecimal("95.00"));
        activity.setObligationMet(true);

        when(mandateRepository.findByMandateCode("MM-TEST00002")).thenReturn(Optional.of(mandate));
        when(activityRepository.save(any(MarketMakingActivity.class))).thenAnswer(i -> i.getArgument(0));

        MarketMakingActivity result = service.recordDailyActivity("MM-TEST00002", activity);

        assertThat(result.getObligationMet()).isTrue();
    }
}
