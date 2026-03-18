package com.cbs.marketdata;
import com.cbs.marketdata.entity.MarketPrice;
import com.cbs.marketdata.repository.*;
import com.cbs.marketdata.service.MarketDataService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketDataServiceTest {
    @Mock private MarketDataFeedRepository feedRepository;
    @Mock private MarketPriceRepository priceRepository;
    @Mock private MarketSignalRepository signalRepository;
    @Mock private ResearchPublicationRepository researchRepository;
    @InjectMocks private MarketDataService service;

    @Test @DisplayName("Latest price returns most recent for instrument")
    void latestPrice() {
        MarketPrice p1 = MarketPrice.builder().instrumentCode("AAPL").priceType("CLOSE").price(new BigDecimal("150.25")).currency("USD").source("BLOOMBERG").priceDate(LocalDate.now()).build();
        MarketPrice p2 = MarketPrice.builder().instrumentCode("AAPL").priceType("CLOSE").price(new BigDecimal("149.50")).currency("USD").source("BLOOMBERG").priceDate(LocalDate.now().minusDays(1)).build();
        when(priceRepository.findByInstrumentCodeOrderByPriceDateDescPriceTimeDesc("AAPL")).thenReturn(List.of(p1, p2));
        List<MarketPrice> result = service.getLatestPrice("AAPL");
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getPrice()).isEqualByComparingTo("150.25");
    }

    @Test @DisplayName("Record price saves successfully")
    void recordPrice() {
        MarketPrice price = MarketPrice.builder().instrumentCode("MSFT").priceType("CLOSE").price(new BigDecimal("380.00")).currency("USD").source("REUTERS").priceDate(LocalDate.now()).build();
        when(priceRepository.save(any())).thenAnswer(i -> { MarketPrice p = i.getArgument(0); p.setId(1L); return p; });
        MarketPrice result = service.recordPrice(price);
        assertThat(result.getId()).isNotNull();
        verify(priceRepository).save(any());
    }
}
