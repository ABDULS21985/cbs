package com.cbs.profitdistribution.repository;

import com.cbs.profitdistribution.entity.AssignmentStatus;
import com.cbs.profitdistribution.entity.PoolAssetAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PoolAssetAssignmentRepository extends JpaRepository<PoolAssetAssignment, Long> {

    List<PoolAssetAssignment> findByPoolIdAndAssignmentStatus(Long poolId, AssignmentStatus status);

    List<PoolAssetAssignment> findByPoolId(Long poolId);

    List<PoolAssetAssignment> findByAssetReferenceId(Long assetReferenceId);

    @Query("""
            SELECT COALESCE(SUM(a.assignedAmount), 0)
            FROM PoolAssetAssignment a
            WHERE a.poolId = :poolId
            AND a.assignmentStatus = 'ACTIVE'
            """)
    BigDecimal sumAssignedAmountByPoolId(@Param("poolId") Long poolId);

    @Query("""
            SELECT COALESCE(SUM(a.assignedAmount), 0)
            FROM PoolAssetAssignment a
            WHERE a.assetReferenceId = :assetReferenceId
            AND a.assignmentStatus = 'ACTIVE'
            """)
    BigDecimal sumAssignedAmountByAssetReferenceId(@Param("assetReferenceId") Long assetReferenceId);
}
