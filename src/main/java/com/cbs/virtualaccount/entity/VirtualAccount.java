package com.cbs.virtualaccount.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "virtual_account")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VirtualAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String virtualAccountNumber;
    @Column(nullable = false) private Long masterAccountId;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 200) private String accountName;
    @Column(nullable = false, length = 40) private String accountPurpose;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) @Builder.Default private BigDecimal virtualBalance = BigDecimal.ZERO;
    @Builder.Default private Boolean autoSweepEnabled = false;
    private BigDecimal sweepThreshold;
    private BigDecimal sweepTargetBalance;
    @Builder.Default private String sweepDirection = "TO_MASTER";
    private String externalReference;
    private String referencePattern;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
