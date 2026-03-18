package com.cbs.capitalmarkets;
import com.cbs.capitalmarkets.entity.CapitalMarketDeal;
import com.cbs.capitalmarkets.entity.DealInvestor;
import com.cbs.capitalmarkets.repository.CapitalMarketDealRepository;
import com.cbs.capitalmarkets.repository.DealInvestorRepository;
import com.cbs.capitalmarkets.service.CapitalMarketsService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.List; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CapitalMarketsServiceTest {
    @Mock private CapitalMarketDealRepository dealRepository;
    @Mock private DealInvestorRepository investorRepository;
    @InjectMocks private CapitalMarketsService service;

    @Test @DisplayName("PRO_RATA allotment distributes proportionally to bid amounts")
    void proRataAllotmentDistributesProportionally() {
        CapitalMarketDeal deal = new CapitalMarketDeal();
        deal.setId(1L); deal.setDealCode("CMD-TEST"); deal.setTargetAmount(new BigDecimal("1000000"));
        deal.setActualAmount(new BigDecimal("2000000"));
        DealInvestor inv1 = new DealInvestor(); inv1.setBidAmount(new BigDecimal("1200000")); inv1.setStatus("BID_RECEIVED");
        DealInvestor inv2 = new DealInvestor(); inv2.setBidAmount(new BigDecimal("800000")); inv2.setStatus("BID_RECEIVED");
        when(dealRepository.findByDealCode("CMD-TEST")).thenReturn(Optional.of(deal));
        when(investorRepository.findByDealIdOrderByBidAmountDesc(1L)).thenReturn(List.of(inv1, inv2));
        when(investorRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));
        when(dealRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.executeAllotment("CMD-TEST", "PRO_RATA");

        // inv1 gets 1200000/2000000 * 2000000 = 1200000
        assertThat(inv1.getAllottedAmount()).isEqualByComparingTo("1200000.0000");
        // inv2 gets 800000/2000000 * 2000000 = 800000
        assertThat(inv2.getAllottedAmount()).isEqualByComparingTo("800000.0000");
        assertThat(inv1.getStatus()).isEqualTo("ALLOTTED");
    }

    @Test @DisplayName("Subscription level equals totalBids divided by targetAmount")
    void subscriptionLevelCalculation() {
        CapitalMarketDeal deal = new CapitalMarketDeal();
        deal.setId(1L); deal.setDealCode("CMD-TEST2"); deal.setTargetAmount(new BigDecimal("1000000"));
        deal.setActualAmount(BigDecimal.ZERO);
        DealInvestor investor = new DealInvestor();
        investor.setBidAmount(new BigDecimal("2500000")); investor.setDealId(1L);
        when(dealRepository.findById(1L)).thenReturn(Optional.of(deal));
        when(dealRepository.findByDealCode("CMD-TEST2")).thenReturn(Optional.of(deal));
        when(investorRepository.findByDealIdOrderByBidAmountDesc(1L)).thenReturn(List.of(investor));
        when(investorRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(dealRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.addInvestorBid(1L, investor);

        // subscriptionLevel = 2500000 / 1000000 = 2.50
        assertThat(deal.getSubscriptionLevel()).isEqualByComparingTo("2.50");
        assertThat(deal.getActualAmount()).isEqualByComparingTo("2500000");
    }
}
