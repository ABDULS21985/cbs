package com.cbs.account.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "account_hold", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AccountHold extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "reference", nullable = false, unique = true, length = 40)
    private String reference;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "placed_by", nullable = false, length = 100)
    private String placedBy;

    @Column(name = "hold_type", nullable = false, length = 20)
    @Builder.Default
    private String holdType = "LIEN";

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Column(name = "released_by", length = 100)
    private String releasedBy;

    @Column(name = "release_reason", length = 500)
    private String releaseReason;
}
