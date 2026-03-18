package com.cbs.securitization.entity;
import jakarta.persistence.*; import lombok.*;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.Map;
@Entity @Table(name = "securitization_vehicle") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecuritizationVehicle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String vehicleCode;
    @Column(nullable = false, length = 200) private String vehicleName;
    @Column(nullable = false, length = 20) private String vehicleType;
    @Column(nullable = false, length = 30) private String underlyingAssetType;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal totalPoolBalance;
    @Column(nullable = false) private Integer numberOfAssets;
    private BigDecimal weightedAvgCoupon; private BigDecimal weightedAvgMaturity;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> tranches;
    private BigDecimal totalIssued; private BigDecimal creditEnhancementPct;
    @Builder.Default private BigDecimal delinquency30dPct = BigDecimal.ZERO;
    @Builder.Default private BigDecimal delinquency60dPct = BigDecimal.ZERO;
    @Builder.Default private BigDecimal delinquency90dPct = BigDecimal.ZERO;
    @Builder.Default private BigDecimal cumulativeLossPct = BigDecimal.ZERO;
    @Builder.Default private BigDecimal prepaymentRateCpr = BigDecimal.ZERO;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "STRUCTURING";
    private LocalDate issueDate; private LocalDate maturityDate;
    private String trusteeName; private String ratingAgency;
    @Builder.Default private Instant createdAt = Instant.now(); @Builder.Default private Instant updatedAt = Instant.now();
}
