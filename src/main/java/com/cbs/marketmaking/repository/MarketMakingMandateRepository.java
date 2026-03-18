package com.cbs.marketmaking.repository;

import com.cbs.marketmaking.entity.MarketMakingMandate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MarketMakingMandateRepository extends JpaRepository<MarketMakingMandate, Long> {
    Optional<MarketMakingMandate> findByMandateCode(String mandateCode);
    List<MarketMakingMandate> findByStatusOrderByMandateNameAsc(String status);
}
