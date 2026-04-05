package com.cbs.integration.repository;

import com.cbs.integration.entity.MarketplaceSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MarketplaceSubscriptionRepository extends JpaRepository<MarketplaceSubscription, Long> {
    Optional<MarketplaceSubscription> findBySubscriptionId(String subscriptionId);
    List<MarketplaceSubscription> findByApiProductIdAndStatusOrderByCreatedAtDesc(Long productId, String status);
    List<MarketplaceSubscription> findBySubscriberClientIdAndStatusOrderByCreatedAtDesc(Long clientId, String status);
    List<MarketplaceSubscription> findByStatusOrderByCreatedAtDesc(String status);
    Optional<MarketplaceSubscription> findByApiProductIdAndSubscriberEmailAndStatusIn(Long productId, String subscriberEmail, List<String> statuses);
}
