package com.cbs.syndicatedloan.repository;

import com.cbs.syndicatedloan.entity.SyndicatedLoanFacility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SyndicatedLoanFacilityRepository extends JpaRepository<SyndicatedLoanFacility, Long> {
    Optional<SyndicatedLoanFacility> findByFacilityCode(String facilityCode);
    List<SyndicatedLoanFacility> findByOurRoleOrderByFacilityNameAsc(String ourRole);
    List<SyndicatedLoanFacility> findByStatusOrderByFacilityNameAsc(String status);
}
