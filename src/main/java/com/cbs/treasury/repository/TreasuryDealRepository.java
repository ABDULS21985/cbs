package com.cbs.treasury.repository;

import com.cbs.treasury.entity.DealStatus;
import com.cbs.treasury.entity.DealType;
import com.cbs.treasury.entity.TreasuryDeal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TreasuryDealRepository extends JpaRepository<TreasuryDeal, Long> {
    Optional<TreasuryDeal> findByDealNumber(String dealNumber);
    Page<TreasuryDeal> findByDealTypeAndStatus(DealType dealType, DealStatus status, Pageable pageable);
    Page<TreasuryDeal> findByStatus(DealStatus status, Pageable pageable);
    @Query("SELECT d FROM TreasuryDeal d WHERE d.status IN ('CONFIRMED','SETTLED') AND d.maturityDate <= :date")
    List<TreasuryDeal> findMaturedDeals(@Param("date") LocalDate date);
    @Query("SELECT d FROM TreasuryDeal d WHERE d.status IN ('CONFIRMED','SETTLED') AND d.leg1ValueDate = :date")
    List<TreasuryDeal> findDealsForSettlement(@Param("date") LocalDate date);
    @Query(value = "SELECT nextval('cbs.treasury_deal_seq')", nativeQuery = true)
    Long getNextDealSequence();
}
