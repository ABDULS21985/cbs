package com.cbs.issueddevice.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "issued_device")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class IssuedDevice extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String deviceCode;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 20) private String deviceType;
    @Column(length = 80) private String deviceIdentifier;
    private Long linkedAccountId;
    private Long issuedBranchId;
    @Column(length = 20) @Builder.Default private String deliveryMethod = "BRANCH_PICKUP";
    @Column(columnDefinition = "TEXT") private String deliveryAddress;
    @Column(nullable = false, length = 15) @Builder.Default private String activationStatus = "INACTIVE";
    private Instant activatedAt;
    private LocalDate expiryDate;
    @Column(length = 30) private String replacementReason;
    @Column(length = 30) private String replacedByCode;
    @Builder.Default private Instant issuedAt = Instant.now();
}
