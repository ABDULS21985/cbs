package com.cbs.integration.repository;

import com.cbs.integration.entity.WebhookRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WebhookRegistrationRepository extends JpaRepository<WebhookRegistration, Long> {
    Optional<WebhookRegistration> findByWebhookId(String webhookId);
    List<WebhookRegistration> findByStatusOrderByCreatedAtDesc(String status);
    List<WebhookRegistration> findByTppClientIdOrderByCreatedAtDesc(Long tppClientId);
    List<WebhookRegistration> findAllByOrderByCreatedAtDesc();
}
