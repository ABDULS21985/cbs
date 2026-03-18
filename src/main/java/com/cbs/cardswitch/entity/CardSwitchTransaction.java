package com.cbs.cardswitch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "card_switch_transaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardSwitchTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String switchRef;
    @Column(nullable = false, length = 20) private String transactionType;
    @Column(nullable = false, length = 64) private String cardHash;
    @Column(nullable = false, length = 20) private String cardScheme;
    @Column(length = 40) private String merchantId;
    @Column(length = 200) private String merchantName;
    @Column(length = 10) private String merchantCategoryCode;
    @Column(length = 30) private String terminalId;
    @Column(nullable = false) private BigDecimal amount;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    private BigDecimal billingAmount;
    @Column(length = 3) private String billingCurrency;
    @Column(nullable = false, length = 4) private String responseCode;
    @Column(length = 10) private String authCode;
    @Column(length = 11) private String acquirerInstitution;
    @Column(length = 11) private String issuerInstitution;
    @Column(length = 40) private String networkRef;
    @Column(length = 10) private String posEntryMode;
    @Column(name = "auth2_settlement_avg_ms") private Integer auth2SettlementAvgMs;
    @Builder.Default private Boolean isInternational = false;
    @Builder.Default private Boolean isDeclined = false;
    @Column(length = 60) private String declineReason;
    private Integer fraudScore;
    @Builder.Default private Instant processedAt = Instant.now();
}
