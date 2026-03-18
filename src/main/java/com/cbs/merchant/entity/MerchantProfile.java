package com.cbs.merchant.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant;
@Entity @Table(name = "merchant_profile") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MerchantProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String merchantId;
    @Column(nullable = false, length = 200) private String merchantName;
    private String tradingName;
    @Column(nullable = false, length = 10) private String merchantCategoryCode;
    @Column(nullable = false, length = 30) private String businessType;
    private String registrationNumber; private String taxId;
    private String contactName; private String contactPhone; private String contactEmail;
    @Column(columnDefinition = "TEXT") private String address;
    private Long settlementAccountId;
    @Column(nullable = false, length = 15) @Builder.Default private String settlementFrequency = "DAILY";
    @Column(nullable = false) private BigDecimal mdrRate;
    @Builder.Default private Integer terminalCount = 0;
    private BigDecimal monthlyVolumeLimit;
    @Column(nullable = false, length = 10) @Builder.Default private String riskCategory = "MEDIUM";
    @Builder.Default private BigDecimal chargebackRate = BigDecimal.ZERO;
    @Builder.Default private String monitoringLevel = "STANDARD";
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PENDING";
    private Instant onboardedAt;
    @Builder.Default private Instant createdAt = Instant.now(); @Builder.Default private Instant updatedAt = Instant.now();
}
