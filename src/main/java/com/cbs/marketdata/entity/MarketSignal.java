package com.cbs.marketdata.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List;
@Entity @Table(name = "market_signal") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketSignal extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String signalCode;
    @Column(nullable = false, length = 30) private String instrumentCode;
    @Column(length = 300) private String instrumentName;
    @Column(nullable = false, length = 20) private String signalType;
    @Column(nullable = false, length = 10) private String signalDirection;
    private BigDecimal confidencePct;
    @Column(length = 10) private String signalStrength;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> indicatorsUsed;
    @Column(columnDefinition = "TEXT") private String analysisSummary;
    private BigDecimal targetPrice; private BigDecimal stopLoss;
    @Column(length = 15) private String timeHorizon;
    @Column(nullable = false) private LocalDate signalDate;
    private LocalDate expiresAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
