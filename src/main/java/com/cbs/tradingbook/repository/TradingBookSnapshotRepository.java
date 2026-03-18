package com.cbs.tradingbook.repository;

import com.cbs.tradingbook.entity.TradingBookSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradingBookSnapshotRepository extends JpaRepository<TradingBookSnapshot, Long> {
    Optional<TradingBookSnapshot> findFirstByBookIdOrderBySnapshotDateDesc(Long bookId);
    List<TradingBookSnapshot> findByBookIdAndSnapshotDateBetween(Long bookId, LocalDate from, LocalDate to);
}
