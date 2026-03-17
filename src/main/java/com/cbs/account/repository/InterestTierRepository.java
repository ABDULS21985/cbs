package com.cbs.account.repository;

import com.cbs.account.entity.InterestTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterestTierRepository extends JpaRepository<InterestTier, Long> {

    List<InterestTier> findByProductIdAndIsActiveTrueOrderByMinBalanceAsc(Long productId);

    @Query("SELECT t FROM InterestTier t WHERE t.product.id = :productId AND t.isActive = true ORDER BY t.minBalance ASC")
    List<InterestTier> findActiveTiersByProduct(@Param("productId") Long productId);
}
