package com.cbs.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "notification_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "template_code", length = 30) private String templateCode;
    @Column(name = "channel", nullable = false, length = 20) @Enumerated(EnumType.STRING) private NotificationChannel channel;
    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "recipient_address", nullable = false, length = 200) private String recipientAddress;
    @Column(name = "recipient_name", length = 200) private String recipientName;
    @Column(name = "subject", length = 300) private String subject;
    @Column(name = "body", nullable = false, columnDefinition = "TEXT") private String body;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Column(name = "provider", length = 50) private String provider;
    @Column(name = "provider_message_id", length = 100) private String providerMessageId;
    @Column(name = "failure_reason", length = 500) private String failureReason;
    @Column(name = "retry_count", nullable = false) @Builder.Default private Integer retryCount = 0;
    @Column(name = "max_retries", nullable = false) @Builder.Default private Integer maxRetries = 3;
    @Column(name = "scheduled_at") private Instant scheduledAt;
    @Column(name = "sent_at") private Instant sentAt;
    @Column(name = "delivered_at") private Instant deliveredAt;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
