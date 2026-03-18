package com.cbs.quotemanagement.repository;

import com.cbs.quotemanagement.entity.QuoteRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuoteRequestRepository extends JpaRepository<QuoteRequest, Long> {
    Optional<QuoteRequest> findByRequestRef(String requestRef);
    List<QuoteRequest> findByStatus(String status);
}
