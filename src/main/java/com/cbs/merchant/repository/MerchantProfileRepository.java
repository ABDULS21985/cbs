package com.cbs.merchant.repository;
import com.cbs.merchant.entity.MerchantProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface MerchantProfileRepository extends JpaRepository<MerchantProfile, Long> {
    Optional<MerchantProfile> findByMerchantId(String merchantId);
    List<MerchantProfile> findByStatusOrderByMerchantNameAsc(String status);
    List<MerchantProfile> findByRiskCategoryOrderByChargebackRateDesc(String riskCategory);
}
