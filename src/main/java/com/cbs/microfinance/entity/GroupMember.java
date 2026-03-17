package com.cbs.microfinance.entity;

import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "group_member", schema = "cbs", uniqueConstraints = @UniqueConstraint(columnNames = {"group_id","customer_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupMember {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private LendingGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private String role = "MEMBER";

    @Column(name = "joined_date", nullable = false)
    @Builder.Default
    private LocalDate joinedDate = LocalDate.now();

    @Column(name = "left_date")
    private LocalDate leftDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "guarantee_amount", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal guaranteeAmount = BigDecimal.ZERO;

    @Column(name = "savings_balance", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal savingsBalance = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Version @Column(name = "version")
    private Long version;
}
