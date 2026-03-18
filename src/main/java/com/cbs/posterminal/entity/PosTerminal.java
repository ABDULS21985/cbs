package com.cbs.posterminal.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name = "pos_terminal")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PosTerminal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String terminalId;
    @Column(nullable = false, length = 20) private String terminalType;
    @Column(nullable = false, length = 80) private String merchantId;
    @Column(nullable = false, length = 200) private String merchantName;
    private String merchantCategoryCode;
    @Column(columnDefinition = "TEXT") private String locationAddress;
    @Builder.Default private Boolean supportsContactless = true;
    @Builder.Default private Boolean supportsChip = true;
    @Builder.Default private Boolean supportsMagstripe = false;
    @Builder.Default private Boolean supportsPin = true;
    @Builder.Default private Boolean supportsQr = false;
    private BigDecimal maxTransactionAmount;
    private String acquiringBankCode;
    private Long settlementAccountId;
    @Builder.Default private String batchSettlementTime = "23:00";
    private Instant lastTransactionAt;
    @Builder.Default private Integer transactionsToday = 0;
    @Column(nullable = false, length = 20) @Builder.Default private String operationalStatus = "ACTIVE";
    private Instant lastHeartbeatAt;
    private String softwareVersion;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
