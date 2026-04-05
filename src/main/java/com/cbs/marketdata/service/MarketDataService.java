package com.cbs.marketdata.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketdata.entity.*;
import com.cbs.marketdata.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketDataService {

    private final MarketDataFeedRepository feedRepository;
    private final MarketPriceRepository priceRepository;
    private final MarketSignalRepository signalRepository;
    private final ResearchPublicationRepository researchRepository;
    private final CurrentActorProvider currentActorProvider;

    private static final BigDecimal OUTLIER_THRESHOLD_PCT = new BigDecimal("0.50");
    private static final long STALE_DATA_THRESHOLD_HOURS = 24;

    @Transactional
    public MarketDataFeed registerFeed(MarketDataFeed feed) {
        validateFeedFields(feed);

        if (feedRepository.existsByFeedNameAndProvider(feed.getFeedName(), feed.getProvider())) {
            throw new BusinessException(
                    "A feed with name '" + feed.getFeedName() + "' from provider '" + feed.getProvider() + "' already exists.",
                    "DUPLICATE_FEED"
            );
        }

        feed.setFeedCode("MDF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (feed.getStatus() == null) {
            feed.setStatus("ACTIVE");
        }
        feed.setIsActive(true);
        feed.setRecordsToday(0);
        feed.setErrorCountToday(0);

        MarketDataFeed saved = feedRepository.save(feed);
        log.info("Market data feed registered: code={}, provider={}, by={}",
                saved.getFeedCode(), saved.getProvider(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarketPrice recordPrice(MarketPrice price) {
        validatePriceFields(price);
        detectStaleData(price);
        detectOutlier(price);

        if (price.getPriceTime() == null) {
            price.setPriceTime(Instant.now());
        }
        if (price.getPriceDate() == null) {
            price.setPriceDate(LocalDate.now());
        }
        price.setCreatedAt(Instant.now());

        MarketPrice saved = priceRepository.save(price);
        log.info("Price recorded: instrument={}, price={}, source={}", saved.getInstrumentCode(), saved.getPrice(), saved.getSource());
        return saved;
    }

    @Transactional
    public MarketSignal recordSignal(MarketSignal signal) {
        if (signal.getInstrumentCode() == null || signal.getInstrumentCode().isBlank()) {
            throw new BusinessException("Instrument code is required for signal.", "INVALID_INSTRUMENT");
        }
        signal.setSignalCode("MS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (signal.getStatus() == null) {
            signal.setStatus("ACTIVE");
        }

        MarketSignal saved = signalRepository.save(signal);
        log.info("Market signal recorded: code={}, instrument={}, by={}",
                saved.getSignalCode(), saved.getInstrumentCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ResearchPublication publishResearch(ResearchPublication pub) {
        if (pub.getTitle() == null || pub.getTitle().isBlank()) {
            throw new BusinessException("Research publication title is required.", "INVALID_TITLE");
        }
        pub.setPublicationCode("RP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        pub.setPublishedAt(Instant.now());
        pub.setStatus("PUBLISHED");

        ResearchPublication saved = researchRepository.save(pub);
        log.info("Research published: code={}, title={}, by={}",
                saved.getPublicationCode(), saved.getTitle(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public MarketDataFeed checkFeedHealth(String feedCode) {
        MarketDataFeed feed = feedRepository.findByFeedCode(feedCode)
                .orElseThrow(() -> new ResourceNotFoundException("MarketDataFeed", "feedCode", feedCode));

        boolean isHealthy = true;
        StringBuilder healthDetails = new StringBuilder();

        if (feed.getLastUpdateAt() != null) {
            Duration sinceLastUpdate = Duration.between(feed.getLastUpdateAt(), Instant.now());
            long expectedFrequency = feed.getUpdateFrequencySec() != null ? feed.getUpdateFrequencySec() * 3L : 3600L;
            if (sinceLastUpdate.getSeconds() > expectedFrequency) {
                isHealthy = false;
                healthDetails.append(String.format("No update in %d minutes (expected every %ds). ",
                        sinceLastUpdate.toMinutes(), feed.getUpdateFrequencySec()));
            }
        }

        if (feed.getErrorCountToday() != null && feed.getRecordsToday() != null && feed.getRecordsToday() > 0) {
            double errorRate = (double) feed.getErrorCountToday() / feed.getRecordsToday();
            if (errorRate > 0.10) {
                isHealthy = false;
                healthDetails.append(String.format("Error rate %.1f%% exceeds 10%% threshold. ", errorRate * 100));
            }
        }

        if (!isHealthy) {
            feed.setStatus("DEGRADED");
            log.warn("Feed health degraded: code={}, details={}", feedCode, healthDetails);
        } else {
            feed.setStatus("ACTIVE");
        }

        return feedRepository.save(feed);
    }

    public List<MarketPrice> getLatestPrice(String instrumentCode) {
        if (instrumentCode == null || instrumentCode.isBlank()) {
            throw new BusinessException("Instrument code is required.", "INVALID_INSTRUMENT");
        }
        return priceRepository.findByInstrumentCodeOrderByPriceDateDescPriceTimeDesc(instrumentCode);
    }

    public List<MarketSignal> getSignals(String instrumentCode) {
        return signalRepository.findByInstrumentCodeAndStatusOrderBySignalDateDesc(instrumentCode, "ACTIVE");
    }

    public List<ResearchPublication> getPublishedResearch() {
        return researchRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED");
    }

    public List<MarketDataFeed> getFeedStatus() {
        return feedRepository.findByStatusOrderByFeedNameAsc("ACTIVE");
    }

    public List<MarketSignal> getAllSignals() {
        return signalRepository.findAll();
    }

    public List<MarketPrice> getAllPrices() {
        return priceRepository.findAll();
    }

    private void validateFeedFields(MarketDataFeed feed) {
        if (feed.getFeedName() == null || feed.getFeedName().isBlank()) {
            throw new BusinessException("Feed name is required.", "INVALID_FEED_NAME");
        }
        if (feed.getProvider() == null || feed.getProvider().isBlank()) {
            throw new BusinessException("Provider is required.", "INVALID_PROVIDER");
        }
        if (feed.getFeedType() == null || feed.getFeedType().isBlank()) {
            throw new BusinessException("Feed type is required.", "INVALID_FEED_TYPE");
        }
        if (feed.getDataCategory() == null || feed.getDataCategory().isBlank()) {
            throw new BusinessException("Data category is required.", "INVALID_DATA_CATEGORY");
        }
    }

    private void validatePriceFields(MarketPrice price) {
        if (price.getInstrumentCode() == null || price.getInstrumentCode().isBlank()) {
            throw new BusinessException("Instrument code is required.", "INVALID_INSTRUMENT");
        }
        if (price.getPrice() == null || price.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Price must be a positive value.", "INVALID_PRICE");
        }
        if (price.getCurrency() == null || price.getCurrency().isBlank()) {
            throw new BusinessException("Currency is required.", "INVALID_CURRENCY");
        }
        if (price.getSource() == null || price.getSource().isBlank()) {
            throw new BusinessException("Price source is required.", "INVALID_SOURCE");
        }
        if (price.getPriceType() == null || price.getPriceType().isBlank()) {
            throw new BusinessException("Price type is required.", "INVALID_PRICE_TYPE");
        }
    }

    private void detectStaleData(MarketPrice price) {
        if (price.getPriceDate() != null && price.getPriceDate().isBefore(LocalDate.now().minusDays(1))) {
            log.warn("Stale price data detected: instrument={}, priceDate={} is older than {} hours",
                    price.getInstrumentCode(), price.getPriceDate(), STALE_DATA_THRESHOLD_HOURS);
        }
    }

    private void detectOutlier(MarketPrice price) {
        List<MarketPrice> recentPrices = priceRepository
                .findTop5ByInstrumentCodeOrderByPriceDateDescPriceTimeDesc(price.getInstrumentCode());

        if (recentPrices.isEmpty()) {
            return;
        }

        BigDecimal avgPrice = recentPrices.stream()
                .map(MarketPrice::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(recentPrices.size()), MathContext.DECIMAL64);

        if (avgPrice.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }

        BigDecimal deviation = price.getPrice().subtract(avgPrice).abs()
                .divide(avgPrice, MathContext.DECIMAL64);

        if (deviation.compareTo(OUTLIER_THRESHOLD_PCT) > 0) {
            log.warn("Outlier price detected: instrument={}, newPrice={}, avgRecent={}, deviation={:.2f}%",
                    price.getInstrumentCode(), price.getPrice(), avgPrice, deviation.multiply(BigDecimal.valueOf(100)));
        }
    }
}
