package com.cbs.integration.repository;

import com.cbs.integration.entity.IntegrationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IntegrationMessageRepository extends JpaRepository<IntegrationMessage, Long> {
    Optional<IntegrationMessage> findByMessageId(String messageId);
    Optional<IntegrationMessage> findByPayloadHash(String payloadHash);
    List<IntegrationMessage> findByRouteIdAndStatusOrderByCreatedAtDesc(Long routeId, String status);
    List<IntegrationMessage> findByCorrelationIdOrderByCreatedAtAsc(String correlationId);
    List<IntegrationMessage> findByStatusOrderByCreatedAtAsc(String status);
}
