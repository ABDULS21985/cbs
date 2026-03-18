package com.cbs.custody.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "settlement_instruction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SettlementInstruction extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String instructionRef;

    @Column(nullable = false)
    private Long custodyAccountId;

    @Column(length = 30)
    private String tradeRef;

    @Column(length = 25)
    private String instructionType;

    @Column(length = 5)
    private String settlementCycle;

    @Column(length = 30)
    private String instrumentCode;

    @Column(length = 300)
    private String instrumentName;

    @Column(length = 12)
    private String isin;

    private BigDecimal quantity;

    private BigDecimal settlementAmount;

    @Column(length = 3)
    private String currency;

    @Column(length = 30)
    private String counterpartyCode;

    @Column(length = 200)
    private String counterpartyName;

    @Column(length = 11)
    private String counterpartyBic;

    @Column(length = 80)
    private String counterpartyAccountRef;

    @Column(length = 30)
    private String depositoryCode;

    @Column(length = 60)
    private String placeOfSettlement;

    private LocalDate intendedSettlementDate;

    private LocalDate actualSettlementDate;

    @Column(length = 15)
    @Builder.Default
    private String matchStatus = "UNMATCHED";

    private Instant matchedAt;

    @Builder.Default
    private Boolean priorityFlag = false;

    @Column(columnDefinition = "TEXT")
    private String holdReason;

    @Column(columnDefinition = "TEXT")
    private String failReason;

    private LocalDate failedSince;

    @Builder.Default
    private BigDecimal penaltyAmount = BigDecimal.ZERO;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "CREATED";
}
