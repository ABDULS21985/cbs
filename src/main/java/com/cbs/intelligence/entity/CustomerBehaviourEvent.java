package com.cbs.intelligence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "customer_behaviour_event")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerBehaviourEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 40) private String eventType;
    @Column(nullable = false, length = 20) private String channel;
    private String sessionId;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> eventData;
    private String deviceType;
    private String geoLocation;
    @Builder.Default private Instant createdAt = Instant.now();
}
