package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "key_usage_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class KeyUsageLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 80) private String keyId;
    @Column(nullable = false, length = 20) private String operation;
    private String resourceType;
    private String resourceId;
    private String performedBy;
    private String ipAddress;
    @Builder.Default private Boolean success = true;
    private String errorMessage;
    @Builder.Default private Instant createdAt = Instant.now();
}
