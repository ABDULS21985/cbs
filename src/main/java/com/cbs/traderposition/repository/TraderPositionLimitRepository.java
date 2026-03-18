package com.cbs.traderposition.repository;

import com.cbs.traderposition.entity.TraderPositionLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TraderPositionLimitRepository extends JpaRepository<TraderPositionLimit, Long> {
    List<TraderPositionLimit> findByDealerIdAndStatus(String dealerId, String status);

    @Query("SELECT l FROM TraderPositionLimit l WHERE l.status = 'BREACHED' AND l.lastBreachDate BETWEEN :from AND :to")
    List<TraderPositionLimit> findBreachedLimitsInRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
