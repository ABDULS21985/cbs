package com.cbs.sanctions.repository;

import com.cbs.sanctions.entity.ScreeningRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ScreeningRequestRepository extends JpaRepository<ScreeningRequest, Long> {
    Optional<ScreeningRequest> findByScreeningRef(String ref);
    Page<ScreeningRequest> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    Page<ScreeningRequest> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
