package com.cbs.trade.repository;

import com.cbs.trade.entity.TradeDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TradeDocumentRepository extends JpaRepository<TradeDocument, Long> {
    Optional<TradeDocument> findByDocumentRef(String ref);
    List<TradeDocument> findByLcId(Long lcId);
    List<TradeDocument> findByCollectionId(Long collectionId);
    Page<TradeDocument> findByVerificationStatusOrderByCreatedAtAsc(String status, Pageable pageable);
}
