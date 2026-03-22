package com.cbs.statements.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Entity
@Table(name = "statement_subscription")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class StatementSubscription extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "account_number", length = 30)
    private String accountNumber;

    @Column(nullable = false, length = 15)
    private String frequency;

    @Column(nullable = false, length = 10)
    private String delivery;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String format = "PDF";

    @Column(length = 200)
    private String email;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "next_delivery")
    private LocalDate nextDelivery;
}
