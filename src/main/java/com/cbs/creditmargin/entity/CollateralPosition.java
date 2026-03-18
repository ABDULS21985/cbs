package com.cbs.creditmargin.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name = "collateral_position") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CollateralPosition extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String positionCode;
    @Column(nullable = false, length = 30) private String counterpartyCode;
    @Column(nullable = false, length = 200) private String counterpartyName;
    @Column(nullable = false, length = 10) private String direction;
    @Column(nullable = false, length = 20) private String collateralType;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal marketValue;
    @Builder.Default private BigDecimal haircutPct = BigDecimal.ZERO;
    private BigDecimal adjustedValue;
    @Builder.Default private Boolean eligible = true;
    private BigDecimal concentrationLimitPct;
    private LocalDate maturityDate; private LocalDate revaluationDate;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
