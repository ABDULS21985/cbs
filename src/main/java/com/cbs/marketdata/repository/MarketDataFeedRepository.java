package com.cbs.marketdata.repository;
import com.cbs.marketdata.entity.MarketDataFeed; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface MarketDataFeedRepository extends JpaRepository<MarketDataFeed, Long> {
    Optional<MarketDataFeed> findByFeedCode(String code); List<MarketDataFeed> findByStatusOrderByFeedNameAsc(String status);
    boolean existsByFeedNameAndProvider(String feedName, String provider);
}
