package com.cbs.card.repository;

import com.cbs.card.entity.CardTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface CardTransactionRepository extends JpaRepository<CardTransaction, Long> {
    Optional<CardTransaction> findByTransactionRef(String transactionRef);
    Page<CardTransaction> findByCardIdOrderByTransactionDateDesc(Long cardId, Pageable pageable);
    Page<CardTransaction> findByAccountIdOrderByTransactionDateDesc(Long accountId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(COALESCE(t.billingAmount, t.amount)), 0) FROM CardTransaction t WHERE t.card.id = :cardId " +
           "AND t.channel = :channel AND t.status IN ('AUTHORIZED','SETTLED') " +
           "AND t.transactionType NOT IN ('REFUND','REVERSAL') AND t.transactionDate >= :since")
    BigDecimal sumDailyUsageByChannel(@Param("cardId") Long cardId, @Param("channel") String channel, @Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(COALESCE(t.billingAmount, t.amount)), 0) FROM CardTransaction t " +
           "WHERE t.originalTransaction.id = :originalTransactionId AND t.status IN ('AUTHORIZED','SETTLED') " +
           "AND t.transactionType IN ('REFUND','REVERSAL')")
    BigDecimal sumSettledAdjustmentsForOriginal(@Param("originalTransactionId") Long originalTransactionId);

    /** Aggregate gross transaction amount for a merchant on a specific settlement date */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CardTransaction t " +
           "WHERE t.merchantId = :merchantId AND t.settlementDate = :settlementDate " +
           "AND t.status IN ('AUTHORIZED','SETTLED') " +
           "AND t.transactionType IN ('PURCHASE','CASH_ADVANCE')")
    BigDecimal sumGrossByMerchantAndDate(@Param("merchantId") String merchantId,
                                         @Param("settlementDate") LocalDate settlementDate);

    /** Count transactions for a merchant on a specific settlement date */
    @Query("SELECT COUNT(t) FROM CardTransaction t " +
           "WHERE t.merchantId = :merchantId AND t.settlementDate = :settlementDate " +
           "AND t.status IN ('AUTHORIZED','SETTLED') " +
           "AND t.transactionType IN ('PURCHASE','CASH_ADVANCE')")
    long countByMerchantAndDate(@Param("merchantId") String merchantId,
                                @Param("settlementDate") LocalDate settlementDate);

    /** Sum refund amounts for a merchant on a specific settlement date */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CardTransaction t " +
           "WHERE t.merchantId = :merchantId AND t.settlementDate = :settlementDate " +
           "AND t.status IN ('AUTHORIZED','SETTLED') " +
           "AND t.transactionType IN ('REFUND','REVERSAL')")
    BigDecimal sumRefundsByMerchantAndDate(@Param("merchantId") String merchantId,
                                           @Param("settlementDate") LocalDate settlementDate);
}
