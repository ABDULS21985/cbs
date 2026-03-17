package com.cbs.branch.repository;

import com.cbs.branch.entity.Branch;
import com.cbs.branch.entity.BranchType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {
    Optional<Branch> findByBranchCode(String branchCode);
    List<Branch> findByParentBranchCodeAndIsActiveTrue(String parentCode);
    List<Branch> findByRegionCodeAndIsActiveTrue(String regionCode);
    List<Branch> findByBranchTypeAndIsActiveTrue(BranchType type);
    List<Branch> findByIsActiveTrueOrderByBranchNameAsc();
}
