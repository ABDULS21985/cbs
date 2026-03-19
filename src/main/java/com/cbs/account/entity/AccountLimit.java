package com.cbs.account.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "account_limit", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(name = "uq_account_limit_type", columnNames = {"account_id", "limit_type"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AccountLimit extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "limit_type", nullable = false, length = 30)
    private String limitType;

    @Column(name = "limit_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal limitValue;

    @Column(name = "previous_value", precision = 18, scale = 2)
    private BigDecimal previousValue;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "effective_date", nullable = false)
    @Builder.Default
    private LocalDate effectiveDate = LocalDate.now();

    @Column(name = "performed_by", length = 100)
    private String performedBy;
}
