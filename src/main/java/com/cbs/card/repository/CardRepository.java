package com.cbs.card.repository;

import com.cbs.card.entity.Card;
import com.cbs.card.entity.CardStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    Optional<Card> findByCardReference(String cardReference);
    @EntityGraph(attributePaths = {"account", "customer"})
    Page<Card> findByCustomerId(Long customerId, Pageable pageable);
    List<Card> findByAccountIdAndStatus(Long accountId, CardStatus status);
    @Query("SELECT c FROM Card c JOIN FETCH c.account JOIN FETCH c.customer WHERE c.id = :id")
    Optional<Card> findByIdWithDetails(@Param("id") Long id);
}
