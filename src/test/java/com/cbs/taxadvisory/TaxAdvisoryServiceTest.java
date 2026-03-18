package com.cbs.taxadvisory;

import com.cbs.taxadvisory.entity.TaxAdvisoryEngagement;
import com.cbs.taxadvisory.repository.TaxAdvisoryEngagementRepository;
import com.cbs.taxadvisory.service.TaxAdvisoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaxAdvisoryServiceTest {

    @Mock
    private TaxAdvisoryEngagementRepository repository;

    @InjectMocks
    private TaxAdvisoryService service;

    @Test
    @DisplayName("Deliver opinion sets text and status OPINION_DELIVERED")
    void deliverOpinionSetsTextAndStatus() {
        TaxAdvisoryEngagement engagement = new TaxAdvisoryEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("TA-TEST00001");
        engagement.setStatus("IN_PROGRESS");

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(TaxAdvisoryEngagement.class))).thenAnswer(i -> i.getArgument(0));

        TaxAdvisoryEngagement result = service.deliverOpinion(1L, "The proposed structure is tax-efficient under current regulations.");

        assertThat(result.getOpinion()).isEqualTo("The proposed structure is tax-efficient under current regulations.");
        assertThat(result.getStatus()).isEqualTo("OPINION_DELIVERED");
    }

    @Test
    @DisplayName("Close sets engagement end date")
    void closeSetsEngagementEndDate() {
        TaxAdvisoryEngagement engagement = new TaxAdvisoryEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("TA-TEST00002");
        engagement.setStatus("OPINION_DELIVERED");

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(TaxAdvisoryEngagement.class))).thenAnswer(i -> i.getArgument(0));

        TaxAdvisoryEngagement result = service.closeEngagement(1L);

        assertThat(result.getStatus()).isEqualTo("CLOSED");
        assertThat(result.getEngagementEndDate()).isNotNull();
    }
}
