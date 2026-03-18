package com.cbs.almfull.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "alm_position") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlmPosition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private LocalDate positionDate;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false, length = 20) private String timeBucket;
    @Builder.Default private BigDecimal cashAndEquivalents = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interbankPlacements = BigDecimal.ZERO;
    @Builder.Default private BigDecimal securitiesHeld = BigDecimal.ZERO;
    @Builder.Default private BigDecimal loansAndAdvances = BigDecimal.ZERO;
    @Builder.Default private BigDecimal fixedAssets = BigDecimal.ZERO;
    @Builder.Default private BigDecimal otherAssets = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalAssets = BigDecimal.ZERO;
    @Builder.Default private BigDecimal demandDeposits = BigDecimal.ZERO;
    @Builder.Default private BigDecimal termDeposits = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interbankBorrowings = BigDecimal.ZERO;
    @Builder.Default private BigDecimal bondsIssued = BigDecimal.ZERO;
    @Builder.Default private BigDecimal otherLiabilities = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalLiabilities = BigDecimal.ZERO;
    private BigDecimal gapAmount;
    private BigDecimal cumulativeGap;
    private BigDecimal gapRatio;
    @Column(name = "nii_impact_up100bp") private BigDecimal niiImpactUp100bp;
    @Column(name = "nii_impact_down100bp") private BigDecimal niiImpactDown100bp;
    @Column(name = "eve_impact_up200bp") private BigDecimal eveImpactUp200bp;
    @Column(name = "eve_impact_down200bp") private BigDecimal eveImpactDown200bp;
    private BigDecimal durationAssets;
    private BigDecimal durationLiabilities;
    private BigDecimal durationGap;
    @Builder.Default private Instant createdAt = Instant.now();
}
