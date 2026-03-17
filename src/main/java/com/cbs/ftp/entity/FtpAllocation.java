package com.cbs.ftp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "ftp_allocation", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FtpAllocation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "allocation_date", nullable = false) private LocalDate allocationDate;
    @Column(name = "entity_type", nullable = false, length = 20) private String entityType;
    @Column(name = "entity_id", nullable = false) private Long entityId;
    @Column(name = "entity_ref", length = 50) private String entityRef;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "average_balance", nullable = false, precision = 18, scale = 2) private BigDecimal averageBalance;
    @Column(name = "actual_rate", nullable = false, precision = 8, scale = 4) private BigDecimal actualRate;
    @Column(name = "ftp_rate", nullable = false, precision = 8, scale = 4) private BigDecimal ftpRate;
    @Column(name = "spread", nullable = false, precision = 8, scale = 4) private BigDecimal spread;
    @Column(name = "interest_income_expense", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal interestIncomeExpense = BigDecimal.ZERO;
    @Column(name = "ftp_charge", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal ftpCharge = BigDecimal.ZERO;
    @Column(name = "net_margin", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal netMargin = BigDecimal.ZERO;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
