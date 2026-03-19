package com.cbs.account.repository;

import com.cbs.account.entity.InterestRateOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterestRateOverrideRepository extends JpaRepository<InterestRateOverride, Long> {

    Optional<InterestRateOverride> findByAccountIdAndIsActiveTrue(Long accountId);

    List<InterestRateOverride> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    @Modifying
    @Query("UPDATE InterestRateOverride o SET o.isActive = false WHERE o.account.id = :accountId AND o.isActive = true")
    void deactivateAllForAccount(@Param("accountId") Long accountId);

    @Modifying
    @Query("UPDATE InterestRateOverride o SET o.isActive = false WHERE o.isActive = true AND o.expiryDate <= :today")
    int expireOverrides(@Param("today") LocalDate today);
}
