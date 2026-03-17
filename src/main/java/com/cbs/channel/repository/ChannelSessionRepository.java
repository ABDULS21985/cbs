package com.cbs.channel.repository;

import com.cbs.channel.entity.ChannelSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface ChannelSessionRepository extends JpaRepository<ChannelSession, Long> {
    Optional<ChannelSession> findBySessionId(String sessionId);
    List<ChannelSession> findByCustomerIdAndStatus(Long customerId, String status);
    @Query("SELECT s FROM ChannelSession s WHERE s.status = 'ACTIVE' AND s.lastActivityAt < CURRENT_TIMESTAMP - (s.timeoutSeconds * INTERVAL '1 second')")
    List<ChannelSession> findExpiredSessions();
    long countByChannelAndStatus(String channel, String status);
}
