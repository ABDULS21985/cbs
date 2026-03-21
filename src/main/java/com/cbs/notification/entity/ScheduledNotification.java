package com.cbs.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "scheduled_notification", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduledNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "template_code", length = 30)
    private String templateCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationChannel channel;

    @Column(name = "event_type", nullable = false, length = 50)
    @Builder.Default
    private String eventType = "SCHEDULED";

    @Column(length = 300)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "cron_expression", length = 100)
    private String cronExpression;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String frequency = "ONCE";

    @Column(name = "next_run")
    private Instant nextRun;

    @Column(name = "last_run")
    private Instant lastRun;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recipient_criteria", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> recipientCriteria = Map.of();

    @Column(name = "recipient_count")
    @Builder.Default
    private Integer recipientCount = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    private Long version;
}
