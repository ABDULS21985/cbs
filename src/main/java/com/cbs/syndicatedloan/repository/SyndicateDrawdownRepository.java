package com.cbs.syndicatedloan.repository;

import com.cbs.syndicatedloan.entity.SyndicateDrawdown;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SyndicateDrawdownRepository extends JpaRepository<SyndicateDrawdown, Long> {
    Optional<SyndicateDrawdown> findByDrawdownRef(String drawdownRef);
    List<SyndicateDrawdown> findByFacilityIdOrderByValueDateDesc(Long facilityId);
}
