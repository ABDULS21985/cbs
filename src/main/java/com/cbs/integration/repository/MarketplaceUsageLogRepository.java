package com.cbs.integration.repository;

import com.cbs.integration.entity.MarketplaceUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.Instant;
import java.util.List;

public interface MarketplaceUsageLogRepository extends JpaRepository<MarketplaceUsageLog, Long> {
    List<MarketplaceUsageLog> findBySubscriptionIdOrderByCreatedAtDesc(Long subscriptionId);
    long countBySubscriptionIdAndCreatedAtAfter(Long subscriptionId, Instant since);

    @Query("SELECT AVG(u.responseTimeMs) FROM MarketplaceUsageLog u WHERE u.apiProductId = :productId AND u.createdAt > :since")
    Double avgResponseTimeByProduct(Long productId, Instant since);

    @Query("SELECT COUNT(u) FROM MarketplaceUsageLog u WHERE u.apiProductId = :productId AND u.responseCode >= 500 AND u.createdAt > :since")
    long countErrorsByProduct(Long productId, Instant since);

    @Query("SELECT COUNT(u) FROM MarketplaceUsageLog u WHERE u.apiProductId = :productId AND u.createdAt > :since")
    long countTotalByProduct(Long productId, Instant since);

    @Query("SELECT COUNT(u) FROM MarketplaceUsageLog u WHERE u.apiProductId = :productId AND u.responseCode >= 200 AND u.responseCode < 400 AND u.createdAt > :since")
    long countSuccessByProduct(Long productId, Instant since);

    List<MarketplaceUsageLog> findByApiProductIdAndCreatedAtAfterOrderByCreatedAtDesc(Long apiProductId, Instant since);
}
