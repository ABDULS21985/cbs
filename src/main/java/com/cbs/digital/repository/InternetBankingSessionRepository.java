package com.cbs.digital.repository;

import com.cbs.digital.entity.InternetBankingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InternetBankingSessionRepository extends JpaRepository<InternetBankingSession, Long> {
    Optional<InternetBankingSession> findBySessionId(String sessionId);
    List<InternetBankingSession> findByCustomerIdAndSessionStatusOrderByLoginAtDesc(Long customerId, String status);
    List<InternetBankingSession> findBySessionStatusOrderByLastActivityAtAsc(String status);
}
