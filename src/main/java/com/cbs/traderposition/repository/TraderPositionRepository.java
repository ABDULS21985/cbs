package com.cbs.traderposition.repository;

import com.cbs.traderposition.entity.TraderPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TraderPositionRepository extends JpaRepository<TraderPosition, Long> {
    List<TraderPosition> findByDealerIdAndStatus(String dealerId, String status);
    Optional<TraderPosition> findByDealerIdAndInstrumentCodeAndCurrencyAndStatus(String dealerId, String instrumentCode, String currency, String status);
    Optional<TraderPosition> findByPositionRef(String positionRef);

    @Query("SELECT p FROM TraderPosition p WHERE p.deskId = :deskId AND p.positionDate = " +
           "(SELECT MAX(p2.positionDate) FROM TraderPosition p2 WHERE p2.deskId = :deskId)")
    List<TraderPosition> findLatestByDeskId(@Param("deskId") Long deskId);

    @Query("SELECT p FROM TraderPosition p WHERE p.limitBreached = true AND p.positionDate BETWEEN :from AND :to")
    List<TraderPosition> findBreachedPositions(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
