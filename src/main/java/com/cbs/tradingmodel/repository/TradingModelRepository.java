package com.cbs.tradingmodel.repository;

import com.cbs.tradingmodel.entity.TradingModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradingModelRepository extends JpaRepository<TradingModel, Long> {
    Optional<TradingModel> findByModelCode(String modelCode);
    List<TradingModel> findAllByOrderByStatusAsc();

    @Query("SELECT m FROM TradingModel m WHERE m.nextReviewDate < :today AND m.status IN ('APPROVED','PRODUCTION')")
    List<TradingModel> findModelsForReview(@Param("today") LocalDate today);
}
