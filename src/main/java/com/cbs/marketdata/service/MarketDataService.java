package com.cbs.marketdata.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketdata.entity.*; import com.cbs.marketdata.repository.*;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MarketDataService {
    private final MarketDataFeedRepository feedRepository;
    private final MarketPriceRepository priceRepository;
    private final MarketSignalRepository signalRepository;
    private final ResearchPublicationRepository researchRepository;
    @Transactional public MarketDataFeed registerFeed(MarketDataFeed feed) { feed.setFeedCode("MDF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); return feedRepository.save(feed); }
    @Transactional public MarketPrice recordPrice(MarketPrice price) { return priceRepository.save(price); }
    @Transactional public MarketSignal recordSignal(MarketSignal signal) { signal.setSignalCode("MS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); return signalRepository.save(signal); }
    @Transactional public ResearchPublication publishResearch(ResearchPublication pub) { pub.setPublicationCode("RP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); pub.setPublishedAt(Instant.now()); pub.setStatus("PUBLISHED"); return researchRepository.save(pub); }
    public List<MarketPrice> getLatestPrice(String instrumentCode) { return priceRepository.findByInstrumentCodeOrderByPriceDateDescPriceTimeDesc(instrumentCode); }
    public List<MarketSignal> getSignals(String instrumentCode) { return signalRepository.findByInstrumentCodeAndStatusOrderBySignalDateDesc(instrumentCode, "ACTIVE"); }
    public List<ResearchPublication> getPublishedResearch() { return researchRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED"); }
    public List<MarketDataFeed> getFeedStatus() { return feedRepository.findByStatusOrderByFeedNameAsc("ACTIVE"); }

    public java.util.List<MarketPrice> getAllPrices() {
        return priceRepository.findAll();
    }

}
