package com.cbs.tradeops.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "trade_confirmation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TradeConfirmation extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String confirmationRef;

    @Column(nullable = false, length = 30)
    private String tradeRef;

    @Column(nullable = false, length = 20)
    private String instrumentType;

    @Column(nullable = false, length = 4)
    private String ourSide;

    @Column(nullable = false, length = 30)
    private String counterpartyCode;

    @Column(nullable = false, length = 200)
    private String counterpartyName;

    @Column(nullable = false)
    private LocalDate tradeDate;

    private LocalDate settlementDate;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false)
    private BigDecimal amount;

    private BigDecimal price;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> ourDetails;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> counterpartyDetails;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String matchStatus = "UNMATCHED";

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> breakFields;

    private Instant matchedAt;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";
}
