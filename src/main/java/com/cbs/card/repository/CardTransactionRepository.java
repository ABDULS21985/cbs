package com.cbs.card.repository;

import com.cbs.card.entity.CardTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

@Repository
public interface CardTransactionRepository extends JpaRepository<CardTransaction, Long> {
    Optional<CardTransaction> findByTransactionRef(String transactionRef);

    @EntityGraph(attributePaths = {"card", "account"})
    Page<CardTransaction> findByCardIdOrderByTransactionDateDesc(Long cardId, Pageable pageable);

    @EntityGraph(attributePaths = {"card", "account"})
    Page<CardTransaction> findByAccountIdOrderByTransactionDateDesc(Long accountId, Pageable pageable);

    @Query("SELECT t FROM CardTransaction t JOIN FETCH t.card JOIN FETCH t.account WHERE t.id = :id")
    Optional<CardTransaction> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CardTransaction t WHERE t.card.id = :cardId " +
           "AND t.channel = :channel AND t.status IN ('AUTHORIZED','SETTLED') AND t.transactionDate >= :since")
    BigDecimal sumDailyUsageByChannel(@Param("cardId") Long cardId, @Param("channel") String channel, @Param("since") Instant since);
}
