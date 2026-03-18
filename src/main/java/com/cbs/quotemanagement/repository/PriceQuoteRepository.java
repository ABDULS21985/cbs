package com.cbs.quotemanagement.repository;

import com.cbs.quotemanagement.entity.PriceQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PriceQuoteRepository extends JpaRepository<PriceQuote, Long> {
    Optional<PriceQuote> findByQuoteRef(String quoteRef);
    List<PriceQuote> findByDeskIdAndStatus(Long deskId, String status);

    @Query("SELECT q FROM PriceQuote q WHERE q.validUntilTime < :now AND q.status = 'ACTIVE'")
    List<PriceQuote> findExpiredActiveQuotes(@Param("now") Instant now);
}
