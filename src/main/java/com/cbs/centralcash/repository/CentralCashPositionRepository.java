package com.cbs.centralcash.repository;
import com.cbs.centralcash.entity.CentralCashPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List; import java.util.Optional;
public interface CentralCashPositionRepository extends JpaRepository<CentralCashPosition, Long> {
    Optional<CentralCashPosition> findByPositionDateAndCurrency(LocalDate date, String currency);
    List<CentralCashPosition> findByCurrencyOrderByPositionDateDesc(String currency);
}
