package com.cbs.trade.repository;

import com.cbs.trade.entity.DocumentaryCollection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DocumentaryCollectionRepository extends JpaRepository<DocumentaryCollection, Long> {
    Optional<DocumentaryCollection> findByCollectionNumber(String number);
    Page<DocumentaryCollection> findByDrawerId(Long customerId, Pageable pageable);
    @org.springframework.data.jpa.repository.Query(value = "SELECT nextval('cbs.dc_seq')", nativeQuery = true)
    Long getNextDcSequence();
}
