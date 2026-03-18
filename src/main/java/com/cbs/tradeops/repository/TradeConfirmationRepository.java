package com.cbs.tradeops.repository;

import com.cbs.tradeops.entity.TradeConfirmation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TradeConfirmationRepository extends JpaRepository<TradeConfirmation, Long> {
    Optional<TradeConfirmation> findByConfirmationRef(String confirmationRef);
    List<TradeConfirmation> findByMatchStatusOrderByTradeDateDesc(String matchStatus);
}
