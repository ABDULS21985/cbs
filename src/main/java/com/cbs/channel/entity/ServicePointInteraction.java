package com.cbs.channel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "service_point_interaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServicePointInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long servicePointId;

    private Long customerId;
    private Long sessionId;

    @Column(nullable = false, length = 15)
    private String interactionType;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> servicesUsed;

    @Column(length = 20)
    private String channelUsed;

    @Builder.Default
    private Boolean staffAssisted = false;

    @Column(length = 80)
    private String staffId;

    @Column(nullable = false)
    @Builder.Default
    private Instant startedAt = Instant.now();

    private Instant endedAt;
    private Integer durationSeconds;
    private Integer customerSatisfactionScore;
    private String feedbackComment;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String outcome = "COMPLETED";

    @Builder.Default
    private Instant createdAt = Instant.now();
}
