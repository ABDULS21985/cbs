package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "psd2_sca_session")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Psd2ScaSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String sessionId;
    @Column(nullable = false, length = 80) private String tppId;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 30) private String scaMethod;
    @Column(nullable = false, length = 20) @Builder.Default private String scaStatus = "STARTED";
    @Column(length = 30) private String exemptionType;
    private Long paymentId;
    private String consentId;
    @Column(columnDefinition = "TEXT") private String challengeData;
    private String ipAddress;
    @Column(columnDefinition = "TEXT") private String userAgent;
    private String psuGeoLocation;
    @Column(nullable = false) private Instant expiresAt;
    @Builder.Default private Instant createdAt = Instant.now();
    private Instant finalisedAt;

    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
}
