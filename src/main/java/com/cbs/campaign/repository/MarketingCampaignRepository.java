package com.cbs.campaign.repository;
import com.cbs.campaign.entity.MarketingCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface MarketingCampaignRepository extends JpaRepository<MarketingCampaign, Long> {
    Optional<MarketingCampaign> findByCampaignCode(String code);
    List<MarketingCampaign> findByStatusOrderByStartDateDesc(String status);
    List<MarketingCampaign> findByCampaignTypeAndStatusOrderByStartDateDesc(String type, String status);
}
