package com.cbs.quotemanagement;

import com.cbs.common.exception.BusinessException;
import com.cbs.quotemanagement.entity.PriceQuote;
import com.cbs.quotemanagement.entity.QuoteRequest;
import com.cbs.quotemanagement.repository.PriceQuoteRepository;
import com.cbs.quotemanagement.repository.QuoteRequestRepository;
import com.cbs.quotemanagement.service.QuoteManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuoteManagementServiceTest {

    @Mock
    private PriceQuoteRepository quoteRepository;

    @Mock
    private QuoteRequestRepository requestRepository;

    @InjectMocks
    private QuoteManagementService service;

    @Test
    @DisplayName("Quote generation auto-calcs midPrice and spreadBps")
    void quoteGenerationCalculatesMidAndSpread() {
        QuoteRequest request = new QuoteRequest();
        request.setId(1L);
        request.setRequestRef("QR-TEST");
        request.setStatus("OPEN");
        request.setQuotesProvided(0);

        PriceQuote quote = new PriceQuote();
        quote.setBidPrice(new BigDecimal("1.30000000"));
        quote.setAskPrice(new BigDecimal("1.30100000"));
        quote.setDealerId("D001");
        quote.setCurrency("USD");
        quote.setInstrumentType("FX_SPOT");
        quote.setQuoteType("FIRM");

        when(requestRepository.findById(1L)).thenReturn(Optional.of(request));
        when(requestRepository.save(any(QuoteRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(quoteRepository.save(any(PriceQuote.class))).thenAnswer(i -> i.getArgument(0));

        PriceQuote result = service.generateQuote(1L, quote);

        assertThat(result.getMidPrice()).isEqualByComparingTo(new BigDecimal("1.30050000"));
        assertThat(result.getSpreadBps()).isNotNull();
        assertThat(result.getQuoteRef()).startsWith("PQ-");
    }

    @Test
    @DisplayName("Accept rejects expired quotes")
    void acceptRejectsExpiredQuotes() {
        PriceQuote quote = new PriceQuote();
        quote.setId(1L);
        quote.setQuoteRef("PQ-TEST");
        quote.setStatus("EXPIRED");

        when(quoteRepository.findById(1L)).thenReturn(Optional.of(quote));

        assertThatThrownBy(() -> service.acceptQuote(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expired");
    }
}
