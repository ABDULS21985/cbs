package com.cbs.marketdata.repository;
import com.cbs.marketdata.entity.MarketSignal; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface MarketSignalRepository extends JpaRepository<MarketSignal, Long> {
    Optional<MarketSignal> findBySignalCode(String code);
    List<MarketSignal> findByInstrumentCodeAndStatusOrderBySignalDateDesc(String instrumentCode, String status);
}
