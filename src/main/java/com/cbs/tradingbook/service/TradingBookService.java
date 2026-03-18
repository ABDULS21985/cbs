package com.cbs.tradingbook.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tradingbook.entity.TradingBook;
import com.cbs.tradingbook.entity.TradingBookSnapshot;
import com.cbs.tradingbook.repository.TradingBookRepository;
import com.cbs.tradingbook.repository.TradingBookSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TradingBookService {

    private final TradingBookRepository bookRepository;
    private final TradingBookSnapshotRepository snapshotRepository;

    @Transactional
    public TradingBook createBook(TradingBook book) {
        book.setBookCode("TB-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        book.setStatus("ACTIVE");
        TradingBook saved = bookRepository.save(book);
        log.info("Trading book created: code={}, type={}", saved.getBookCode(), saved.getBookType());
        return saved;
    }

    @Transactional
    public TradingBookSnapshot takeEodSnapshot(Long bookId) {
        TradingBook book = findBookOrThrow(bookId);

        TradingBookSnapshot snapshot = TradingBookSnapshot.builder()
                .bookId(book.getId())
                .snapshotDate(LocalDate.now())
                .snapshotType("EOD")
                .positionCount(book.getPositionCount())
                .grossPositionValue(book.getGrossPositionValue())
                .netPositionValue(book.getNetPositionValue())
                .realizedPnl(BigDecimal.ZERO)
                .unrealizedPnl(book.getDailyPnl())
                .totalPnl(book.getDailyPnl())
                .var951d(book.getVarAmount())
                .capitalCharge(book.getCapitalRequirement())
                .build();

        TradingBookSnapshot saved = snapshotRepository.save(snapshot);
        log.info("EOD snapshot taken for book {}: date={}", book.getBookCode(), saved.getSnapshotDate());
        return saved;
    }

    public Map<String, Object> getBookDashboard(Long bookId) {
        TradingBook book = findBookOrThrow(bookId);
        TradingBookSnapshot latestSnapshot = snapshotRepository.findFirstByBookIdOrderBySnapshotDateDesc(bookId).orElse(null);
        return Map.of("book", book, "latestSnapshot", latestSnapshot != null ? latestSnapshot : Map.of());
    }

    public List<TradingBookSnapshot> getBookHistory(Long bookId, LocalDate from, LocalDate to) {
        return snapshotRepository.findByBookIdAndSnapshotDateBetween(bookId, from, to);
    }

    public List<TradingBook> getAllBooks() {
        return bookRepository.findAllByOrderByBookType();
    }

    public BigDecimal getCapitalRequirement(Long bookId) {
        TradingBookSnapshot snapshot = snapshotRepository.findFirstByBookIdOrderBySnapshotDateDesc(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("TradingBookSnapshot", "bookId", bookId));
        return snapshot.getCapitalCharge();
    }

    private TradingBook findBookOrThrow(Long bookId) {
        return bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("TradingBook", "id", bookId));
    }
}
