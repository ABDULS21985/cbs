package com.cbs.digital.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "internet_banking_session")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InternetBankingSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String sessionId;
    @Column(nullable = false) private Long customerId;
    private String deviceFingerprint;
    private String ipAddress;
    @Column(columnDefinition = "TEXT") private String userAgent;
    @Column(nullable = false, length = 20) private String loginMethod;
    @Builder.Default private Boolean mfaCompleted = false;
    @Column(nullable = false, length = 20) @Builder.Default private String sessionStatus = "ACTIVE";
    @Builder.Default private Instant lastActivityAt = Instant.now();
    @Builder.Default private Integer idleTimeoutMin = 15;
    @Builder.Default private Integer absoluteTimeoutMin = 480;
    @Builder.Default private Instant loginAt = Instant.now();
    private Instant logoutAt;
    @Builder.Default private Instant createdAt = Instant.now();

    public boolean isIdle() {
        return lastActivityAt.plusSeconds(idleTimeoutMin * 60L).isBefore(Instant.now());
    }
    public boolean isAbsoluteExpired() {
        return loginAt.plusSeconds(absoluteTimeoutMin * 60L).isBefore(Instant.now());
    }
}
