package com.cbs.eventing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "domain_event", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DomainEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "event_id", nullable = false, unique = true, length = 50) private String eventId;
    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Column(name = "aggregate_type", nullable = false, length = 50) private String aggregateType;
    @Column(name = "aggregate_id", nullable = false) private Long aggregateId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "payload", nullable = false, columnDefinition = "jsonb") private Map<String, Object> payload;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "metadata", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> metadata = new HashMap<>();
    @Column(name = "sequence_number", nullable = false) private Long sequenceNumber;
    @Column(name = "published", nullable = false) @Builder.Default private Boolean published = false;
    @Column(name = "published_at") private Instant publishedAt;
    @Column(name = "topic", length = 100) private String topic;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
