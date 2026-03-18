package com.cbs.security.mfa.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "mfa_enrollment", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MfaEnrollment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false, length = 100) private String userId;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "mfa_method", nullable = false, length = 20) private String mfaMethod;
    @Column(name = "secret_hash", length = 128) private String secretHash;
    @Column(name = "device_id", length = 100) private String deviceId;
    @Column(name = "phone_number", length = 20) private String phoneNumber;
    @Column(name = "email_address", length = 100) private String emailAddress;
    @Column(name = "credential_id", length = 200) private String credentialId;
    @Column(name = "public_key", columnDefinition = "TEXT") private String publicKey;
    @Column(name = "is_primary", nullable = false) @Builder.Default private Boolean isPrimary = false;
    @Column(name = "is_verified", nullable = false) @Builder.Default private Boolean isVerified = false;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "last_used_at") private Instant lastUsedAt;
    @Column(name = "failure_count", nullable = false) @Builder.Default private Integer failureCount = 0;
    @Column(name = "locked_until") private Instant lockedUntil;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public boolean isLocked() { return lockedUntil != null && Instant.now().isBefore(lockedUntil); }
    public void recordFailure(int maxFailures, int lockoutMinutes) {
        failureCount++;
        if (failureCount >= maxFailures) lockedUntil = Instant.now().plusSeconds(lockoutMinutes * 60L);
    }
    public void recordSuccess() { failureCount = 0; lockedUntil = null; lastUsedAt = Instant.now(); }
}
