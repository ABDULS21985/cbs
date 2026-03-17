package com.cbs.escrow.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "escrow_mandate", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class EscrowMandate extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mandate_number", nullable = false, unique = true, length = 30)
    private String mandateNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "escrow_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private EscrowType escrowType;

    @Column(name = "purpose", nullable = false, columnDefinition = "TEXT")
    private String purpose;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "depositor_customer_id")
    private Customer depositor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "beneficiary_customer_id")
    private Customer beneficiary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "release_conditions", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> releaseConditions = new ArrayList<>();

    @Column(name = "requires_multi_sign", nullable = false)
    @Builder.Default
    private Boolean requiresMultiSign = false;

    @Column(name = "required_signatories")
    @Builder.Default
    private Integer requiredSignatories = 1;

    @Column(name = "mandated_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal mandatedAmount;

    @Column(name = "released_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal releasedAmount = BigDecimal.ZERO;

    @Column(name = "remaining_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal remainingAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "effective_date", nullable = false)
    @Builder.Default
    private LocalDate effectiveDate = LocalDate.now();

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EscrowStatus status = EscrowStatus.ACTIVE;

    @OneToMany(mappedBy = "mandate", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<EscrowRelease> releases = new ArrayList<>();

    public void release(BigDecimal amount) {
        this.releasedAmount = this.releasedAmount.add(amount);
        this.remainingAmount = this.mandatedAmount.subtract(this.releasedAmount);
        if (this.remainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            this.status = EscrowStatus.FULLY_RELEASED;
            this.remainingAmount = BigDecimal.ZERO;
        } else {
            this.status = EscrowStatus.PARTIALLY_RELEASED;
        }
    }
}
