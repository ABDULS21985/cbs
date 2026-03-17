package com.cbs.overdraft.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "facility_utilization_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FacilityUtilizationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", nullable = false)
    private CreditFacility facility;

    @Column(name = "transaction_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private UtilizationType transactionType;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "running_utilized", nullable = false, precision = 18, scale = 2)
    private BigDecimal runningUtilized;

    @Column(name = "running_available", nullable = false, precision = 18, scale = 2)
    private BigDecimal runningAvailable;

    @Column(name = "narration", length = 300)
    private String narration;

    @Column(name = "transaction_ref", length = 40)
    private String transactionRef;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;
}
