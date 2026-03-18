package com.cbs.centralcashhandling.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.Instant; import java.util.Map;
@Entity @Table(name = "cash_vault") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CashVault extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String vaultCode;
    @Column(nullable = false, length = 200) private String vaultName;
    @Column(nullable = false, length = 15) private String vaultType;
    private Long branchId;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "NGN";
    @Column(nullable = false) @Builder.Default private BigDecimal totalBalance = BigDecimal.ZERO;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> denominationBreakdown;
    private BigDecimal insuranceLimit;
    private Instant lastCountedAt; private Instant lastReconciledAt;
    @Column(length = 200) private String custodianName;
    @Builder.Default private Boolean dualControl = true;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
