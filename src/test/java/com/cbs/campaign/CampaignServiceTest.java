package com.cbs.campaign;

import com.cbs.common.exception.BusinessException;
import com.cbs.campaign.entity.MarketingCampaign;
import com.cbs.campaign.repository.MarketingCampaignRepository;
import com.cbs.campaign.service.CampaignService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CampaignServiceTest {

    @Mock private MarketingCampaignRepository campaignRepository;
    @InjectMocks private CampaignService service;

    @Test @DisplayName("Campaign lifecycle: DRAFT → APPROVED → ACTIVE")
    void lifecycle() {
        MarketingCampaign c = MarketingCampaign.builder().id(1L).campaignCode("CMP-TEST")
                .campaignName("Spring Sale").status("DRAFT").startDate(LocalDate.now()).build();
        when(campaignRepository.findByCampaignCode("CMP-TEST")).thenReturn(Optional.of(c));
        when(campaignRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MarketingCampaign approved = service.approve("CMP-TEST", "marketing_mgr");
        assertThat(approved.getStatus()).isEqualTo("APPROVED");

        MarketingCampaign launched = service.launch("CMP-TEST");
        assertThat(launched.getStatus()).isEqualTo("ACTIVE");
    }

    @Test @DisplayName("Cannot launch unapproved campaign")
    void cannotLaunchDraft() {
        MarketingCampaign c = MarketingCampaign.builder().id(1L).campaignCode("CMP-DRAFT").status("DRAFT").build();
        when(campaignRepository.findByCampaignCode("CMP-DRAFT")).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.launch("CMP-DRAFT"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("APPROVED");
    }

    @Test @DisplayName("Performance metrics calculate rates correctly")
    void performanceMetrics() {
        MarketingCampaign c = MarketingCampaign.builder().id(1L).campaignCode("CMP-PERF")
                .sentCount(1000).deliveredCount(950).openedCount(380).clickedCount(95)
                .convertedCount(19).revenueGenerated(new BigDecimal("50000")).build();
        when(campaignRepository.findByCampaignCode("CMP-PERF")).thenReturn(Optional.of(c));

        Map<String, Object> perf = service.getPerformance("CMP-PERF");
        assertThat(((BigDecimal) perf.get("open_rate_pct")).doubleValue()).isCloseTo(40.0, within(0.1));
        assertThat(((BigDecimal) perf.get("click_rate_pct")).doubleValue()).isCloseTo(25.0, within(0.1));
        assertThat(((BigDecimal) perf.get("conversion_rate_pct")).doubleValue()).isCloseTo(20.0, within(0.1));
    }
}
