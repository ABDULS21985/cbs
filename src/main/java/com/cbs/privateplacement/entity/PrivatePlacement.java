package com.cbs.privateplacement.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name = "private_placement") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class PrivatePlacement extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String placementCode;
    private Long dealId;
    @Column(nullable = false, length = 30) private String placementType;
    @Column(nullable = false, length = 200) private String issuerName;
    private Long issuerCustomerId;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "NGN";
    @Column(nullable = false) private BigDecimal targetAmount;
    @Builder.Default private BigDecimal raisedAmount = BigDecimal.ZERO;
    @Column(columnDefinition = "TEXT") private String instrumentDescription;
    private BigDecimal couponRate;
    private LocalDate maturityDate;
    @Column(columnDefinition = "JSONB") private String conversionTerms;
    private BigDecimal minimumSubscription;
    private Integer maxInvestors;
    @Builder.Default private Integer currentInvestors = 0;
    @Column(nullable = false, length = 25) private String eligibilityType;
    @Column(length = 200) private String offeringMemorandumRef;
    @Column(length = 80) private String secExemptionRef;
    private LocalDate closingDate;
    private LocalDate fundsReceivedDate;
    @Column(nullable = false, length = 20) private String ourRole;
    @Column(length = 15) private String ourFeeType;
    private BigDecimal ourFeeAmount;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "STRUCTURING";
}
