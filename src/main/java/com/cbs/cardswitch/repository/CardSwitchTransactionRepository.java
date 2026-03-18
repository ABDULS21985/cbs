package com.cbs.cardswitch.repository;

import com.cbs.cardswitch.entity.CardSwitchTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CardSwitchTransactionRepository extends JpaRepository<CardSwitchTransaction, Long> {
    Optional<CardSwitchTransaction> findBySwitchRef(String ref);
    List<CardSwitchTransaction> findByCardSchemeAndProcessedAtBetweenOrderByProcessedAtDesc(String scheme, Instant from, Instant to);
    List<CardSwitchTransaction> findByMerchantIdOrderByProcessedAtDesc(String merchantId);
    List<CardSwitchTransaction> findByIsDeclinedTrueOrderByProcessedAtDesc();
    long countByCardSchemeAndProcessedAtBetween(String scheme, Instant from, Instant to);
    long countByCardSchemeAndIsDeclinedFalseAndProcessedAtBetween(String scheme, Instant from, Instant to);
    long countByCardSchemeAndIsDeclinedTrueAndProcessedAtBetween(String scheme, Instant from, Instant to);
}
