package com.cbs.liquidityrisk.repository;
import com.cbs.liquidityrisk.entity.LiquidityMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List; import java.util.Optional;
public interface LiquidityMetricRepository extends JpaRepository<LiquidityMetric, Long> {
    Optional<LiquidityMetric> findByMetricDateAndCurrency(LocalDate date, String currency);
    List<LiquidityMetric> findByCurrencyOrderByMetricDateDesc(String currency);
    List<LiquidityMetric> findByLcrBreachTrueOrderByMetricDateDesc();
}
