package com.cbs.security.mfa.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "mfa_challenge", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MfaChallenge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "challenge_id", nullable = false, unique = true, length = 50) private String challengeId;
    @Column(name = "user_id", nullable = false, length = 100) private String userId;
    @Column(name = "mfa_method", nullable = false, length = 20) private String mfaMethod;
    @Column(name = "otp_hash", length = 128) private String otpHash;
    @Column(name = "challenge_data", length = 500) private String challengeData;
    @Column(name = "ip_address", length = 45) private String ipAddress;
    @Column(name = "user_agent", length = 500) private String userAgent;
    @Column(name = "action_context", length = 100) private String actionContext;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Column(name = "attempts", nullable = false) @Builder.Default private Integer attempts = 0;
    @Column(name = "max_attempts", nullable = false) @Builder.Default private Integer maxAttempts = 3;
    @Column(name = "verified_at") private Instant verifiedAt;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();

    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
    public boolean hasAttemptsRemaining() { return attempts < maxAttempts; }
}
