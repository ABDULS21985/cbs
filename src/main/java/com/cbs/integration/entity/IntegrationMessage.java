package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "integration_message")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IntegrationMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String messageId;
    @Column(nullable = false) private Long routeId;
    private String correlationId;
    @Column(nullable = false, length = 10) private String direction;
    @Column(nullable = false, length = 60) private String messageType;
    @Column(nullable = false, length = 40) @Builder.Default private String contentType = "application/json";
    private String payloadHash;
    private Long payloadSizeBytes;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> headers;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "RECEIVED";
    @Builder.Default private Integer retryCount = 0;
    @Column(columnDefinition = "TEXT") private String errorMessage;
    private Integer processingTimeMs;
    @Builder.Default private Instant createdAt = Instant.now();
    private Instant deliveredAt;
}
