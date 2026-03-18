package com.cbs.marketdata.repository;
import com.cbs.marketdata.entity.MarketPrice; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MarketPriceRepository extends JpaRepository<MarketPrice, Long> {
    List<MarketPrice> findByInstrumentCodeOrderByPriceDateDescPriceTimeDesc(String instrumentCode);
}
