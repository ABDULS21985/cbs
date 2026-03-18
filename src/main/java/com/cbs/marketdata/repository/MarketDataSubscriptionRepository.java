package com.cbs.marketdata.repository;

import com.cbs.marketdata.entity.MarketDataSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MarketDataSubscriptionRepository extends JpaRepository<MarketDataSubscription, Long> {
    List<MarketDataSubscription> findByIsActiveTrueOrderBySubscriberSystemAsc();
}
