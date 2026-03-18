package com.cbs.advertising.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.advertising.entity.AdPlacement;
import com.cbs.advertising.repository.AdPlacementRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AdvertisingService {
    private final AdPlacementRepository repository;
    @Transactional
    public AdPlacement create(AdPlacement ad) {
        ad.setPlacementCode("AD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        ad.setStatus("DRAFT");
        return repository.save(ad);
    }
    @Transactional
    public AdPlacement goLive(String code) {
        AdPlacement ad = getByCode(code); ad.setStatus("LIVE"); return repository.save(ad);
    }
    @Transactional
    public AdPlacement recordPerformance(String code, long impressions, long clicks, int conversions) {
        AdPlacement ad = getByCode(code);
        ad.setImpressions(impressions); ad.setClicks(clicks); ad.setConversions(conversions);
        if (impressions > 0) ad.setCtrPct(BigDecimal.valueOf(clicks).divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        if (clicks > 0) ad.setConversionRatePct(BigDecimal.valueOf(conversions).divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        if (conversions > 0 && ad.getSpentAmount() != null) ad.setCostPerAcquisition(ad.getSpentAmount().divide(BigDecimal.valueOf(conversions), 4, RoundingMode.HALF_UP));
        if (ad.getSpentAmount() != null && ad.getSpentAmount().compareTo(BigDecimal.ZERO) > 0) ad.setRoasPct(ad.getRevenueAttributed().divide(ad.getSpentAmount(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        return repository.save(ad);
    }
    public List<AdPlacement> getByStatus(String status) { return repository.findByStatusOrderByStartDateDesc(status); }
    public List<AdPlacement> getByMediaType(String type) { return repository.findByMediaTypeAndStatusOrderByStartDateDesc(type, "LIVE"); }
    public AdPlacement getByCode(String code) {
        return repository.findByPlacementCode(code).orElseThrow(() -> new ResourceNotFoundException("AdPlacement", "placementCode", code));
    }
}
