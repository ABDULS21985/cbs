package com.cbs.ussd.repository;

import com.cbs.ussd.entity.UssdSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UssdSessionRepository extends JpaRepository<UssdSession, Long> {
    Optional<UssdSession> findBySessionIdAndStatus(String sessionId, String status);
    Optional<UssdSession> findByMsisdnAndStatus(String msisdn, String status);
}
