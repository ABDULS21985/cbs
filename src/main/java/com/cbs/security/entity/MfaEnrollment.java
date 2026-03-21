package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "mfa_enrollment", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MfaEnrollment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 30) private String mfaMethod;
    private String secretEncrypted;
    @Column(length = 200) private String deviceId;
    @Column(length = 30) private String phoneNumber;
    @Column(length = 200) private String emailAddress;
    @Column(columnDefinition = "TEXT") private String fidoCredentialId;
    @Column(columnDefinition = "TEXT") private String fidoPublicKey;
    @Column(nullable = false) @Builder.Default private Boolean isPrimary = false;
    @Column(nullable = false) @Builder.Default private Boolean isVerified = false;
    private Instant verifiedAt;
    private Instant lastUsedAt;
    @Column(nullable = false) @Builder.Default private Integer failureCount = 0;
    private Instant lockedUntil;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
