package com.cbs.merchant.repository;

import com.cbs.merchant.entity.AcquiringFacility;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AcquiringFacilityRepository extends JpaRepository<AcquiringFacility, Long> {
    List<AcquiringFacility> findByMerchantIdAndStatus(Long merchantId, String status);
    List<AcquiringFacility> findByMerchantId(Long merchantId);
    List<AcquiringFacility> findByStatus(String status);
}
