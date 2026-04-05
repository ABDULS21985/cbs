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
    @Query(value = "SELECT * FROM cbs.channel_session s WHERE s.status = 'ACTIVE' AND s.last_activity_at < NOW() - (s.timeout_seconds * INTERVAL '1 second')", nativeQuery = true)
    List<ChannelSession> findExpiredSessions();
    long countByChannelAndStatus(String channel, String status);
    long countByCustomerIdAndStatus(Long customerId, String status);
}
