package com.cbs.fingateway.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant;
@Entity @Table(name = "financial_gateway") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FinancialGateway {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String gatewayCode;
    @Column(nullable = false, length = 200) private String gatewayName;
    @Column(nullable = false, length = 20) private String gatewayType;
    @Column(nullable = false, length = 20) private String protocol;
    private String bicCode; private String endpointUrl;
    @Column(nullable = false, length = 20) @Builder.Default private String authMethod = "CERTIFICATE";
    @Builder.Default private String encryptionStandard = "TLS_1_3";
    private String primaryConnection; private String backupConnection;
    @Column(nullable = false, length = 15) @Builder.Default private String connectionStatus = "CONNECTED";
    private Instant lastHeartbeatAt;
    private Integer dailyVolumeLimit; private BigDecimal dailyValueLimit;
    @Builder.Default private Integer messagesToday = 0; @Builder.Default private BigDecimal valueToday = BigDecimal.ZERO;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now(); @Builder.Default private Instant updatedAt = Instant.now();
}
