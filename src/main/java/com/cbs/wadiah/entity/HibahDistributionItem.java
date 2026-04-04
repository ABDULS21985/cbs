package com.cbs.wadiah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "hibah_distribution_item", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HibahDistributionItem extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "wadiah_account_id", nullable = false)
    private Long wadiahAccountId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "average_balance", precision = 18, scale = 2)
    private BigDecimal averageBalance;

    @Column(name = "minimum_balance", precision = 18, scale = 2)
    private BigDecimal minimumBalance;

    @Column(name = "hibah_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal hibahAmount;

    @Column(name = "hibah_rate", precision = 8, scale = 4)
    private BigDecimal hibahRate;

    @Column(name = "calculation_basis", length = 300)
    private String calculationBasis;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WadiahDomainEnums.HibahItemStatus status = WadiahDomainEnums.HibahItemStatus.PENDING;

    @Column(name = "exclusion_reason", length = 250)
    private String exclusionReason;

    @Column(name = "transaction_ref", length = 40)
    private String transactionRef;

    @Column(name = "credited_at")
    private LocalDateTime creditedAt;
}
