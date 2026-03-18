package com.cbs.projectfinance.repository;

import com.cbs.projectfinance.entity.ProjectFinanceFacility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectFinanceFacilityRepository extends JpaRepository<ProjectFinanceFacility, Long> {
    Optional<ProjectFinanceFacility> findByFacilityCode(String facilityCode);
    List<ProjectFinanceFacility> findByStatusOrderByProjectNameAsc(String status);
}
