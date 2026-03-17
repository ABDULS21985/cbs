package com.cbs.tax.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "tax_transaction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TaxTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "tax_code", nullable = false, length = 20) private String taxCode;
    @Column(name = "tax_type", nullable = false, length = 20) private String taxType;
    @Column(name = "source_module", nullable = false, length = 30) private String sourceModule;
    @Column(name = "source_ref", length = 50) private String sourceRef;
    @Column(name = "account_id") private Long accountId;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "base_amount", nullable = false, precision = 18, scale = 2) private BigDecimal baseAmount;
    @Column(name = "tax_rate_applied", nullable = false, precision = 8, scale = 4) private BigDecimal taxRateApplied;
    @Column(name = "tax_amount", nullable = false, precision = 18, scale = 2) private BigDecimal taxAmount;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "journal_id") private Long journalId;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "CALCULATED";
    @Column(name = "remittance_ref", length = 50) private String remittanceRef;
    @Column(name = "remittance_date") private LocalDate remittanceDate;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
