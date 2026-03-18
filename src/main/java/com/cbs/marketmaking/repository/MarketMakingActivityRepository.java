package com.cbs.marketmaking.repository;

import com.cbs.marketmaking.entity.MarketMakingActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MarketMakingActivityRepository extends JpaRepository<MarketMakingActivity, Long> {
    List<MarketMakingActivity> findByMandateIdOrderByActivityDateDesc(Long mandateId);
    List<MarketMakingActivity> findByMandateIdAndActivityDateBetweenOrderByActivityDateAsc(Long mandateId, LocalDate from, LocalDate to);
    List<MarketMakingActivity> findByObligationMetFalseOrderByActivityDateDesc();
}
