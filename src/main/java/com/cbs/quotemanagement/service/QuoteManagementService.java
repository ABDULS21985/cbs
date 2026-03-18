package com.cbs.quotemanagement.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.quotemanagement.entity.PriceQuote;
import com.cbs.quotemanagement.entity.QuoteRequest;
import com.cbs.quotemanagement.repository.PriceQuoteRepository;
import com.cbs.quotemanagement.repository.QuoteRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuoteManagementService {

    private final PriceQuoteRepository quoteRepository;
    private final QuoteRequestRepository requestRepository;

    @Transactional
    public QuoteRequest submitQuoteRequest(QuoteRequest request) {
        request.setRequestRef("QR-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        request.setStatus("OPEN");
        request.setQuotesProvided(0);
        request.setRequestedAt(Instant.now());
        QuoteRequest saved = requestRepository.save(request);
        log.info("Quote request submitted: ref={}", saved.getRequestRef());
        return saved;
    }

    @Transactional
    public PriceQuote generateQuote(Long requestId, PriceQuote quote) {
        QuoteRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("QuoteRequest", "id", requestId));

        quote.setQuoteRef("PQ-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        quote.setStatus("ACTIVE");
        quote.setValidFromTime(Instant.now());

        BigDecimal mid = quote.getBidPrice().add(quote.getAskPrice()).divide(BigDecimal.valueOf(2), 8, RoundingMode.HALF_UP);
        quote.setMidPrice(mid);

        if (mid.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal spread = quote.getAskPrice().subtract(quote.getBidPrice())
                    .divide(mid, 8, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(10000));
            quote.setSpreadBps(spread);
        }

        request.setQuotesProvided(request.getQuotesProvided() + 1);
        request.setStatus("QUOTED");
        requestRepository.save(request);

        PriceQuote saved = quoteRepository.save(quote);
        log.info("Quote generated: ref={}, mid={}, spread={}bps", saved.getQuoteRef(), mid, saved.getSpreadBps());
        return saved;
    }

    @Transactional
    public PriceQuote acceptQuote(Long quoteId) {
        PriceQuote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new ResourceNotFoundException("PriceQuote", "id", quoteId));

        if ("EXPIRED".equals(quote.getStatus())) {
            throw new BusinessException("Cannot accept an expired quote");
        }

        quote.setStatus("ACCEPTED");
        quote.setTradedRef("TR-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        log.info("Quote {} accepted", quote.getQuoteRef());
        return quoteRepository.save(quote);
    }

    @Transactional
    public int expireQuotes() {
        List<PriceQuote> expired = quoteRepository.findExpiredActiveQuotes(Instant.now());
        expired.forEach(q -> q.setStatus("EXPIRED"));
        quoteRepository.saveAll(expired);
        log.info("Expired {} stale quotes", expired.size());
        return expired.size();
    }

    public List<PriceQuote> getActiveQuotes(Long deskId) {
        return quoteRepository.findByDeskIdAndStatus(deskId, "ACTIVE");
    }

    public List<QuoteRequest> getQuoteRequests(String status) {
        return requestRepository.findByStatus(status);
    }
}
