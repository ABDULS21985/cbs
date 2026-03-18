package com.cbs.almfull.repository;
import com.cbs.almfull.entity.AlmPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List;
public interface AlmPositionRepository extends JpaRepository<AlmPosition, Long> {
    List<AlmPosition> findByPositionDateAndCurrencyOrderByTimeBucketAsc(LocalDate date, String currency);
}
