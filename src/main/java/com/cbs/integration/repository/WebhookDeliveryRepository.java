package com.cbs.integration.repository;

import com.cbs.integration.entity.WebhookDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, Long> {
    List<WebhookDelivery> findByWebhookIdOrderByDeliveredAtDesc(Long webhookId);
    List<WebhookDelivery> findByWebhookIdAndStatusOrderByDeliveredAtDesc(Long webhookId, String status);
    long countByWebhookIdAndStatus(Long webhookId, String status);
}
