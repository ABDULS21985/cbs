package com.cbs.syndicatedloan.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "syndicate_drawdown")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SyndicateDrawdown extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String drawdownRef;

    @Column(nullable = false)
    private Long facilityId;

    @Column(nullable = false, length = 15)
    private String drawdownType;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(length = 10)
    private String interestPeriod;

    private BigDecimal interestRate;

    @Column(nullable = false)
    private LocalDate valueDate;

    @Column(nullable = false)
    private LocalDate maturityDate;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "REQUESTED";
}
