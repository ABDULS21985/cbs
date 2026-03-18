package com.cbs.marketdata.repository;

import com.cbs.marketdata.entity.MarketDataSwitch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MarketDataSwitchRepository extends JpaRepository<MarketDataSwitch, Long> {
    List<MarketDataSwitch> findByStatusOrderBySwitchNameAsc(String status);
}
