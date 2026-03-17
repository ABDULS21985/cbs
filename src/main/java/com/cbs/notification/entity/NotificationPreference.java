package com.cbs.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "notification_preference", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"customer_id","channel","event_type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationPreference {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(name = "channel", nullable = false, length = 20) @Enumerated(EnumType.STRING) private NotificationChannel channel;
    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Column(name = "is_enabled", nullable = false) @Builder.Default private Boolean isEnabled = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
}
