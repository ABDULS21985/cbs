package com.cbs.programtrading.repository;

import com.cbs.programtrading.entity.TradingStrategy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TradingStrategyRepository extends JpaRepository<TradingStrategy, Long> {
    Optional<TradingStrategy> findByStrategyCode(String strategyCode);
    List<TradingStrategy> findByStatusOrderByStrategyNameAsc(String status);
}
