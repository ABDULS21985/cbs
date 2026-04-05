package com.cbs.corpfinance;

import com.cbs.corpfinance.entity.CorporateFinanceEngagement;
import com.cbs.corpfinance.repository.CorporateFinanceEngagementRepository;
import com.cbs.corpfinance.service.CorporateFinanceService;
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
class CorporateFinanceServiceTest {

    @Mock
    private CorporateFinanceEngagementRepository repository;

    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks
    private CorporateFinanceService service;

    @Test
    @DisplayName("Draft delivery sets status DRAFT_DELIVERED and date")
    void draftDeliverySetsStatusAndDate() {
        CorporateFinanceEngagement engagement = new CorporateFinanceEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("CF-TEST00001");
        engagement.setStatus("ANALYSIS");

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(CorporateFinanceEngagement.class))).thenAnswer(i -> i.getArgument(0));

        CorporateFinanceEngagement result = service.deliverDraft(1L);

        assertThat(result.getStatus()).isEqualTo("DRAFT_DELIVERED");
        assertThat(result.getDraftDeliveryDate()).isNotNull();
    }

    @Test
    @DisplayName("Fee invoice increments totalFeesInvoiced")
    void feeInvoiceIncrementsTotalFeesInvoiced() {
        CorporateFinanceEngagement engagement = new CorporateFinanceEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("CF-TEST00002");
        engagement.setTotalFeesInvoiced(new BigDecimal("200000"));

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(CorporateFinanceEngagement.class))).thenAnswer(i -> i.getArgument(0));

        CorporateFinanceEngagement result = service.recordFeeInvoice(1L, new BigDecimal("75000"));

        assertThat(result.getTotalFeesInvoiced()).isEqualByComparingTo(new BigDecimal("275000"));
    }

    @Test
    @DisplayName("Fee payment increments totalFeesPaid")
    void feePaymentIncrementsTotalFeesPaid() {
        CorporateFinanceEngagement engagement = new CorporateFinanceEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("CF-TEST00003");
        engagement.setTotalFeesPaid(new BigDecimal("100000"));

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(CorporateFinanceEngagement.class))).thenAnswer(i -> i.getArgument(0));

        CorporateFinanceEngagement result = service.recordFeePayment(1L, new BigDecimal("50000"));

        assertThat(result.getTotalFeesPaid()).isEqualByComparingTo(new BigDecimal("150000"));
    }

    @Test
    @DisplayName("Close engagement sets COMPLETED status and completion date")
    void closeEngagementSetsCompletedStatusAndDate() {
        CorporateFinanceEngagement engagement = new CorporateFinanceEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("CF-TEST00004");
        engagement.setStatus("FINAL_DELIVERED");

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(CorporateFinanceEngagement.class))).thenAnswer(i -> i.getArgument(0));

        CorporateFinanceEngagement result = service.closeEngagement(1L);

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getCompletionDate()).isNotNull();
    }

    @Test
    @DisplayName("Finalize delivery sets FINAL_DELIVERED status and date")
    void finalizeDeliverySetsStatusAndDate() {
        CorporateFinanceEngagement engagement = new CorporateFinanceEngagement();
        engagement.setId(1L);
        engagement.setEngagementCode("CF-TEST00005");
        engagement.setStatus("DRAFT_DELIVERED");

        when(repository.findById(1L)).thenReturn(Optional.of(engagement));
        when(repository.save(any(CorporateFinanceEngagement.class))).thenAnswer(i -> i.getArgument(0));

        CorporateFinanceEngagement result = service.finalizeDelivery(1L);

        assertThat(result.getStatus()).isEqualTo("FINAL_DELIVERED");
        assertThat(result.getFinalDeliveryDate()).isNotNull();
    }

    @Test
    @DisplayName("Create engagement generates code and initializes fees")
    void createEngagementGeneratesCodeAndInitializesFees() {
        when(repository.save(any(CorporateFinanceEngagement.class))).thenAnswer(i -> i.getArgument(0));

        CorporateFinanceEngagement input = new CorporateFinanceEngagement();
        input.setEngagementName("Test Valuation");
        input.setEngagementType("BUSINESS_VALUATION");
        input.setClientName("Test Corp");
        input.setOurRole("SOLE_ADVISER");

        CorporateFinanceEngagement result = service.createEngagement(input);

        assertThat(result.getEngagementCode()).startsWith("CF-");
        assertThat(result.getStatus()).isEqualTo("PROPOSAL");
        assertThat(result.getTotalFeesInvoiced()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.getTotalFeesPaid()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
