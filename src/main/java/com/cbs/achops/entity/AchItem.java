package com.cbs.achops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ach_item", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AchItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private AchBatch batch;

    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    @Column(name = "account_number", length = 34)
    private String accountNumber;

    @Column(name = "routing_number", length = 20)
    private String routingNumber;

    @Column(name = "account_name", length = 200)
    private String accountName;

    @Column(name = "transaction_code", length = 10)
    private String transactionCode;

    @Column(precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(length = 300)
    private String addenda;

    @Column(length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "return_code", length = 10)
    private String returnCode;

    @Column(name = "return_reason", length = 300)
    private String returnReason;

    @Column(name = "posted_at")
    private Instant postedAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
