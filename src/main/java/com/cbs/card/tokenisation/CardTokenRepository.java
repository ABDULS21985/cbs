package com.cbs.card.tokenisation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CardTokenRepository extends JpaRepository<CardToken, Long> {
    Optional<CardToken> findByTokenRef(String tokenRef);
    List<CardToken> findByCardIdAndStatus(Long cardId, TokenStatus status);
    List<CardToken> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<CardToken> findByCardIdOrderByCreatedAtDesc(Long cardId);
    long countByCardIdAndStatus(Long cardId, TokenStatus status);
}
