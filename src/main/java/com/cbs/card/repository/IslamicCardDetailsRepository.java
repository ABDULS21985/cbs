package com.cbs.card.repository;

import com.cbs.card.entity.CardStatus;
import com.cbs.card.entity.IslamicCardDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface IslamicCardDetailsRepository extends JpaRepository<IslamicCardDetails, Long> {

    Optional<IslamicCardDetails> findByCardId(Long cardId);

    Optional<IslamicCardDetails> findByCardAccountIdAndCardStatusIn(Long accountId, Collection<CardStatus> statuses);
}