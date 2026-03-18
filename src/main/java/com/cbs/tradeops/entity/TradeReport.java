package com.cbs.tradeops.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "trade_report")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TradeReport extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String reportRef;

    @Column(nullable = false, length = 30)
    private String tradeRef;

    @Column(nullable = false, length = 20)
    private String reportType;

    @Column(nullable = false, length = 20)
    private String regime;

    @Column(length = 60)
    private String tradeRepository;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> reportData;

    @Column(length = 60)
    private String uti;

    @Column(length = 20)
    private String lei;

    private Instant submittedAt;

    @Column(length = 80)
    private String submissionRef;

    @Column(length = 80)
    private String acknowledgementRef;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";

    private String rejectionReason;
}
