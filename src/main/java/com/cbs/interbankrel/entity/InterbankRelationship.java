package com.cbs.interbankrel.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "interbank_relationship")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class InterbankRelationship extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String relationshipCode;

    private Long counterpartyBankId;

    @Column(nullable = false, length = 200)
    private String bankName;

    @Column(length = 11)
    private String bicCode;

    @Column(nullable = false, length = 30)
    private String relationshipType;

    private BigDecimal creditLineAmount;

    @Builder.Default
    private BigDecimal creditLineUsed = BigDecimal.ZERO;

    private LocalDate agreementDate;
    private LocalDate reviewDate;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ACTIVE";
}
