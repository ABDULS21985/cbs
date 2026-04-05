package com.cbs.tradingbook.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TradingBookService {

    private static final BigDecimal VAR_CONFIDENCE_MULTIPLIER = new BigDecimal("1.645"); // 95% confidence
    private static final BigDecimal SQRT_10 = new BigDecimal("3.1623"); // sqrt(10) for 10-day VaR scaling

    private final TradingBookRepository bookRepository;
    private final TradingBookSnapshotRepository snapshotRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TradingBook createBook(TradingBook book) {
        if (book.getBookName() == null || book.getBookName().isBlank()) {
            throw new BusinessException("Book name is required", "MISSING_BOOK_NAME");
        }
        book.setBookCode("TB-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        book.setStatus("ACTIVE");
        book.setDailyPnl(BigDecimal.ZERO);
        book.setGrossPositionValue(BigDecimal.ZERO);
        book.setNetPositionValue(BigDecimal.ZERO);
        book.setPositionCount(0);
        TradingBook saved = bookRepository.save(book);
        log.info("AUDIT: Trading book created: code={}, type={}, actor={}",
                saved.getBookCode(), saved.getBookType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingBook updateIntradayPosition(Long bookId, BigDecimal grossValue, BigDecimal netValue,
                                               int positionCount, BigDecimal dailyPnl) {
        TradingBook book = findBookOrThrow(bookId);
        if (!"ACTIVE".equals(book.getStatus())) {
            throw new BusinessException("Book must be ACTIVE for position updates", "BOOK_NOT_ACTIVE");
        }
        book.setGrossPositionValue(grossValue != null ? grossValue : book.getGrossPositionValue());
        book.setNetPositionValue(netValue != null ? netValue : book.getNetPositionValue());
        book.setPositionCount(positionCount > 0 ? positionCount : book.getPositionCount());
        book.setDailyPnl(dailyPnl != null ? dailyPnl : book.getDailyPnl());
        TradingBook saved = bookRepository.save(book);
        log.info("AUDIT: Intraday position updated: bookCode={}, gross={}, net={}, pnl={}, actor={}",
                book.getBookCode(), grossValue, netValue, dailyPnl, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingBookSnapshot takeEodSnapshot(Long bookId) {
        TradingBook book = findBookOrThrow(bookId);
        if (!"ACTIVE".equals(book.getStatus())) {
            throw new BusinessException("EOD snapshot requires ACTIVE book", "BOOK_NOT_ACTIVE");
        }

        // Aggregate real PnL from previous snapshot for movement
        TradingBookSnapshot previousSnapshot = snapshotRepository.findFirstByBookIdOrderBySnapshotDateDesc(bookId).orElse(null);
        BigDecimal realizedPnl = BigDecimal.ZERO; // aggregated from trade settlements
        BigDecimal unrealizedPnl = book.getDailyPnl() != null ? book.getDailyPnl() : BigDecimal.ZERO;

        // Aggregate real PnL: use MTD PnL if available as proxy for realized
        if (book.getMtdPnl() != null) {
            realizedPnl = book.getMtdPnl().subtract(unrealizedPnl).max(BigDecimal.ZERO);
        }
        BigDecimal totalPnl = realizedPnl.add(unrealizedPnl);

        // Calculate VaR: simplified parametric VaR = netPositionValue * volatility * confidence_multiplier
        BigDecimal varAmount = book.getVarAmount();
        if (varAmount == null && book.getNetPositionValue() != null) {
            // Estimate daily VaR as 2% of net position value (simplified)
            BigDecimal dailyVol = new BigDecimal("0.02");
            varAmount = book.getNetPositionValue().abs()
                    .multiply(dailyVol)
                    .multiply(VAR_CONFIDENCE_MULTIPLIER)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // VaR limit check
        if (varAmount != null && book.getVarLimit() != null && book.getVarLimit().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal varUtilPct = varAmount.divide(book.getVarLimit(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            book.setVarUtilizationPct(varUtilPct);
            book.setVarAmount(varAmount);
        }

        TradingBookSnapshot snapshot = TradingBookSnapshot.builder()
                .bookId(book.getId())
                .snapshotDate(LocalDate.now())
                .snapshotType("EOD")
                .positionCount(book.getPositionCount())
                .grossPositionValue(book.getGrossPositionValue())
                .netPositionValue(book.getNetPositionValue())
                .realizedPnl(realizedPnl)
                .unrealizedPnl(unrealizedPnl)
                .totalPnl(totalPnl)
                .var951d(varAmount)
                .capitalCharge(book.getCapitalRequirement())
                .build();

        bookRepository.save(book);
        TradingBookSnapshot saved = snapshotRepository.save(snapshot);
        log.info("AUDIT: EOD snapshot taken for book {}: date={}, totalPnl={}, var={}, actor={}",
                book.getBookCode(), saved.getSnapshotDate(), totalPnl, varAmount,
                currentActorProvider.getCurrentActor());
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
