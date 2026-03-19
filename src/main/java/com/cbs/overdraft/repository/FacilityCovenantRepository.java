package com.cbs.overdraft.repository;

import com.cbs.overdraft.entity.FacilityCovenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacilityCovenantRepository extends JpaRepository<FacilityCovenant, Long> {

    List<FacilityCovenant> findByFacilityIdOrderByNextTestDateAsc(Long facilityId);
}
