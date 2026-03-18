package com.cbs.trade.repository;

import com.cbs.trade.entity.FactoringFacility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FactoringFacilityRepository extends JpaRepository<FactoringFacility, Long> {
    Optional<FactoringFacility> findByFacilityCode(String facilityCode);
    List<FactoringFacility> findByStatus(String status);
    List<FactoringFacility> findBySellerCustomerId(Long sellerCustomerId);
}
