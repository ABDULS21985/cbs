package com.cbs.advertising.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.advertising.entity.AdPlacement;
import com.cbs.advertising.repository.AdPlacementRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AdvertisingService {
    private final AdPlacementRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public AdPlacement create(AdPlacement ad) {
        if (ad.getPlacementName() == null || ad.getPlacementName().isBlank()) {
            throw new BusinessException("Placement name is required", "MISSING_PLACEMENT_NAME");
        }
        if (ad.getMediaType() == null || ad.getMediaType().isBlank()) {
            throw new BusinessException("Media type is required", "MISSING_MEDIA_TYPE");
        }
        ad.setPlacementCode("AD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        ad.setStatus("DRAFT");
        AdPlacement saved = repository.save(ad);
        log.info("AUDIT: Ad placement created: code={}, campaign={}, actor={}",
                saved.getPlacementCode(), saved.getPlacementName(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public AdPlacement goLive(String code) {
        AdPlacement ad = getByCode(code);
        // Validate required fields before going live
        if (!"DRAFT".equals(ad.getStatus())) {
            throw new BusinessException("Ad placement " + code + " must be DRAFT to go live; current: " + ad.getStatus(), "INVALID_STATUS");
        }
        if (ad.getStartDate() == null) {
            throw new BusinessException("Start date is required before going live", "MISSING_START_DATE");
        }
        if (ad.getBudgetAmount() != null && ad.getSpentAmount() != null
                && ad.getSpentAmount().compareTo(ad.getBudgetAmount()) > 0) {
            throw new BusinessException("Spent amount already exceeds budget", "BUDGET_EXCEEDED");
        }
        ad.setStatus("LIVE");
        AdPlacement saved = repository.save(ad);
        log.info("AUDIT: Ad placement went live: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public AdPlacement recordPerformance(String code, long impressions, long clicks, int conversions) {
        AdPlacement ad = getByCode(code);
        ad.setImpressions(impressions); ad.setClicks(clicks); ad.setConversions(conversions);
        if (impressions > 0) ad.setCtrPct(BigDecimal.valueOf(clicks).divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        if (clicks > 0) ad.setConversionRatePct(BigDecimal.valueOf(conversions).divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        if (conversions > 0 && ad.getSpentAmount() != null) ad.setCostPerAcquisition(ad.getSpentAmount().divide(BigDecimal.valueOf(conversions), 4, RoundingMode.HALF_UP));
        // Null safety on revenueAttributed
        BigDecimal revenue = ad.getRevenueAttributed() != null ? ad.getRevenueAttributed() : BigDecimal.ZERO;
        if (ad.getSpentAmount() != null && ad.getSpentAmount().compareTo(BigDecimal.ZERO) > 0) {
            ad.setRoasPct(revenue.divide(ad.getSpentAmount(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        }
        // Campaign budget tracking
        if (ad.getBudgetAmount() != null && ad.getSpentAmount() != null
                && ad.getSpentAmount().compareTo(ad.getBudgetAmount()) >= 0) {
            log.warn("AUDIT: Ad placement {} has exhausted its budget (spent={}, budget={})",
                    code, ad.getSpentAmount(), ad.getBudgetAmount());
        }
        AdPlacement saved = repository.save(ad);
        log.info("AUDIT: Ad performance recorded: code={}, impressions={}, clicks={}, conversions={}, actor={}",
                code, impressions, clicks, conversions, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<AdPlacement> getByStatus(String status) { return repository.findByStatusOrderByStartDateDesc(status); }
    public List<AdPlacement> getByMediaType(String type) { return repository.findByMediaTypeAndStatusOrderByStartDateDesc(type, "LIVE"); }
    public AdPlacement getByCode(String code) {
        return repository.findByPlacementCode(code).orElseThrow(() -> new ResourceNotFoundException("AdPlacement", "placementCode", code));
    }
}
