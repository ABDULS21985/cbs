package com.cbs.privateplacement.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name = "placement_investor") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class PlacementInvestor extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long placementId;
    @Column(nullable = false, length = 200) private String investorName;
    @Column(nullable = false, length = 20) private String investorType;
    @Column(nullable = false) private BigDecimal commitmentAmount;
    @Builder.Default private BigDecimal paidAmount = BigDecimal.ZERO;
    private BigDecimal unitsAllocated;
    private LocalDate subscriptionDate;
    @Builder.Default private Boolean kycVerified = false;
    @Builder.Default private Boolean accreditationVerified = false;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "COMMITTED";
}
