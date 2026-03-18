package com.cbs.campaign.service;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.campaign.entity.MarketingCampaign;
import com.cbs.campaign.repository.MarketingCampaignRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CampaignService {
    private final MarketingCampaignRepository campaignRepository;
    @Transactional
    public MarketingCampaign create(MarketingCampaign campaign) {
        campaign.setCampaignCode("CMP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return campaignRepository.save(campaign);
    }
    @Transactional
    public MarketingCampaign approve(String campaignCode, String approvedBy) {
        MarketingCampaign c = getCampaign(campaignCode);
        if (!"DRAFT".equals(c.getStatus())) throw new BusinessException("Only DRAFT campaigns can be approved");
        c.setStatus("APPROVED"); c.setApprovedBy(approvedBy); c.setUpdatedAt(Instant.now());
        return campaignRepository.save(c);
    }
    @Transactional
    public MarketingCampaign launch(String campaignCode) {
        MarketingCampaign c = getCampaign(campaignCode);
        if (!"APPROVED".equals(c.getStatus()) && !"SCHEDULED".equals(c.getStatus())) throw new BusinessException("Campaign must be APPROVED/SCHEDULED to launch");
        c.setStatus("ACTIVE"); c.setUpdatedAt(Instant.now()); return campaignRepository.save(c);
    }
    @Transactional
    public MarketingCampaign recordMetrics(String campaignCode, int sent, int delivered, int opened, int clicked, int converted) {
        MarketingCampaign c = getCampaign(campaignCode);
        c.setSentCount(c.getSentCount() + sent); c.setDeliveredCount(c.getDeliveredCount() + delivered);
        c.setOpenedCount(c.getOpenedCount() + opened); c.setClickedCount(c.getClickedCount() + clicked);
        c.setConvertedCount(c.getConvertedCount() + converted); c.setUpdatedAt(Instant.now());
        return campaignRepository.save(c);
    }
    public Map<String, Object> getPerformance(String campaignCode) {
        MarketingCampaign c = getCampaign(campaignCode);
        double openRate = c.getDeliveredCount() > 0 ? (double) c.getOpenedCount() / c.getDeliveredCount() * 100 : 0;
        double clickRate = c.getOpenedCount() > 0 ? (double) c.getClickedCount() / c.getOpenedCount() * 100 : 0;
        double conversionRate = c.getClickedCount() > 0 ? (double) c.getConvertedCount() / c.getClickedCount() * 100 : 0;
        return Map.of("campaign", campaignCode, "sent", c.getSentCount(), "delivered", c.getDeliveredCount(),
                "open_rate_pct", BigDecimal.valueOf(openRate).setScale(2, RoundingMode.HALF_UP),
                "click_rate_pct", BigDecimal.valueOf(clickRate).setScale(2, RoundingMode.HALF_UP),
                "conversion_rate_pct", BigDecimal.valueOf(conversionRate).setScale(2, RoundingMode.HALF_UP),
                "converted", c.getConvertedCount(), "revenue", c.getRevenueGenerated());
    }
    public List<MarketingCampaign> getActive() { return campaignRepository.findByStatusOrderByStartDateDesc("ACTIVE"); }
    private MarketingCampaign getCampaign(String code) { return campaignRepository.findByCampaignCode(code).orElseThrow(() -> new ResourceNotFoundException("MarketingCampaign", "campaignCode", code)); }
}
