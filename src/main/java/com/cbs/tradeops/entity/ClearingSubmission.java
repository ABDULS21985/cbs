package com.cbs.tradeops.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "clearing_submission")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ClearingSubmission extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String submissionRef;

    @Column(nullable = false, length = 30)
    private String tradeRef;

    @Column(nullable = false, length = 100)
    private String ccpName;

    @Column(length = 20)
    private String ccpCode;

    @Column(nullable = false, length = 20)
    private String instrumentType;

    @Column(length = 30)
    private String clearingMemberId;

    @Column(nullable = false)
    private LocalDate tradeDate;

    private LocalDate settlementDate;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false)
    private BigDecimal notionalAmount;

    private BigDecimal initialMargin;
    private BigDecimal variationMargin;

    @Column(length = 3)
    private String marginCurrency;

    private Instant submittedAt;
    private Instant clearedAt;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";

    private String rejectionReason;
}
