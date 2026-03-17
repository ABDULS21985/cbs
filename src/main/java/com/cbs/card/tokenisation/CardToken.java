package com.cbs.card.tokenisation;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "card_token", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardToken {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "token_ref", nullable = false, unique = true, length = 30) private String tokenRef;
    @Column(name = "card_id", nullable = false) private Long cardId;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(name = "token_number_hash", nullable = false, length = 64) private String tokenNumberHash;
    @Column(name = "token_number_suffix", nullable = false, length = 4) private String tokenNumberSuffix;
    @Column(name = "token_requestor_id", length = 20) private String tokenRequestorId;

    @Column(name = "wallet_provider", nullable = false, length = 20)
    @Enumerated(EnumType.STRING) private WalletProvider walletProvider;

    @Column(name = "device_name", length = 100) private String deviceName;
    @Column(name = "device_id", length = 100) private String deviceId;
    @Column(name = "device_type", length = 20) private String deviceType;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING) @Builder.Default private TokenStatus status = TokenStatus.REQUESTED;

    @Column(name = "activated_at") private Instant activatedAt;
    @Column(name = "suspended_at") private Instant suspendedAt;
    @Column(name = "suspend_reason", length = 200) private String suspendReason;
    @Column(name = "deactivated_at") private Instant deactivatedAt;
    @Column(name = "deactivation_reason", length = 200) private String deactivationReason;
    @Column(name = "token_expiry_date") private LocalDate tokenExpiryDate;
    @Column(name = "last_used_at") private Instant lastUsedAt;
    @Column(name = "transaction_count", nullable = false) @Builder.Default private Integer transactionCount = 0;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public void recordUse() { this.transactionCount++; this.lastUsedAt = Instant.now(); }
    public boolean isActive() { return status == TokenStatus.ACTIVE; }
}
