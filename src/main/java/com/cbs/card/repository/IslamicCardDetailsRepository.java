package com.cbs.card.repository;

import com.cbs.card.entity.CardStatus;
import com.cbs.card.entity.IslamicCardDetails;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface IslamicCardDetailsRepository extends JpaRepository<IslamicCardDetails, Long> {

    Optional<IslamicCardDetails> findByCardId(Long cardId);

    Optional<IslamicCardDetails> findByCardAccountIdAndCardStatusIn(Long accountId, Collection<CardStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<IslamicCardDetails> findByWadiahAccountId(Long wadiahAccountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<IslamicCardDetails> findByMudarabahAccountId(Long mudarabahAccountId);
}