package com.cbs.tradeops.repository;

import com.cbs.tradeops.entity.TradeReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TradeReportRepository extends JpaRepository<TradeReport, Long> {
    Optional<TradeReport> findByReportRef(String reportRef);
}
