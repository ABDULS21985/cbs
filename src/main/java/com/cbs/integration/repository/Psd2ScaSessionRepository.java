package com.cbs.integration.repository;

import com.cbs.integration.entity.Psd2ScaSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface Psd2ScaSessionRepository extends JpaRepository<Psd2ScaSession, Long> {
    Optional<Psd2ScaSession> findBySessionId(String sessionId);
    List<Psd2ScaSession> findByTppIdAndScaStatusOrderByCreatedAtDesc(String tppId, String scaStatus);
    List<Psd2ScaSession> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
