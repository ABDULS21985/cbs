package com.cbs.branch.repository;

import com.cbs.branch.entity.BranchFacility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BranchFacilityRepository extends JpaRepository<BranchFacility, Long> {
    List<BranchFacility> findByBranchIdAndStatus(Long branchId, String status);
    List<BranchFacility> findByNextInspectionDueBefore(LocalDate date);
}
