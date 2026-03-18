package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "encryption_key")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EncryptionKey {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 80) private String keyId;
    @Column(nullable = false, length = 150) private String keyAlias;
    @Column(nullable = false, length = 30) private String keyType;
    @Column(nullable = false, length = 40) private String purpose;
    @Column(columnDefinition = "TEXT") private String encryptedMaterial;
    private String kekId;
    private String hsmKeyHandle;
    @Column(nullable = false, length = 30) @Builder.Default private String algorithm = "AES/GCM/NoPadding";
    @Builder.Default private Integer keySizeBits = 256;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Integer rotationIntervalDays = 90;
    private Instant lastRotatedAt;
    private Instant nextRotationAt;
    private Instant expiresAt;
    private String createdBy;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();

    public boolean needsRotation() {
        return nextRotationAt != null && Instant.now().isAfter(nextRotationAt);
    }
}
