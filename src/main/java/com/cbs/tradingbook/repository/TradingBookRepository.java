package com.cbs.tradingbook.repository;

import com.cbs.tradingbook.entity.TradingBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TradingBookRepository extends JpaRepository<TradingBook, Long> {
    Optional<TradingBook> findByBookCode(String bookCode);
    List<TradingBook> findAllByOrderByBookType();
}
