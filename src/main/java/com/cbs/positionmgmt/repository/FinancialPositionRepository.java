package com.cbs.positionmgmt.repository;

import com.cbs.positionmgmt.entity.FinancialPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FinancialPositionRepository extends JpaRepository<FinancialPosition, Long> {
    Optional<FinancialPosition> findByPositionCode(String code);
    List<FinancialPosition> findByPositionTypeAndPositionDateOrderByNetPositionDesc(String type, LocalDate date);
    List<FinancialPosition> findByLimitBreachTrueOrderByPositionDateDesc();
}
