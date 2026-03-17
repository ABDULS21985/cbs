package com.cbs.eventing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "event_subscription", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventSubscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "subscription_name", nullable = false, unique = true, length = 100) private String subscriptionName;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "event_types", columnDefinition = "jsonb") @Builder.Default private List<String> eventTypes = List.of("*");
    @Column(name = "delivery_type", nullable = false, length = 20) private String deliveryType;
    @Column(name = "delivery_url", length = 500) private String deliveryUrl;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "delivery_config", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> deliveryConfig = new HashMap<>();
    @Column(name = "filter_expression", length = 500) private String filterExpression;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "last_delivered_event_id") private Long lastDeliveredEventId;
    @Column(name = "failure_count", nullable = false) @Builder.Default private Integer failureCount = 0;
    @Column(name = "max_retries", nullable = false) @Builder.Default private Integer maxRetries = 3;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public boolean matchesEventType(String eventType) {
        return eventTypes.contains("*") || eventTypes.contains(eventType);
    }
}
