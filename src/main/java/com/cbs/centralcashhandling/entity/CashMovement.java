package com.cbs.centralcashhandling.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.Map;
@Entity @Table(name = "cash_movement") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CashMovement extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String movementRef;
    @Column(length = 30) private String fromVaultCode;
    @Column(length = 30) private String toVaultCode;
    @Column(nullable = false, length = 20) private String movementType;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "NGN";
    @Column(nullable = false) private BigDecimal amount;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> denominationDetail;
    @Column(length = 100) private String citCompany;
    @Column(length = 40) private String sealNumber;
    private Integer escortCount;
    @Column(length = 80) private String authorizedBy;
    @Column(length = 80) private String receivedBy;
    private LocalDate scheduledDate; private LocalDate actualDate;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "SCHEDULED";
}
