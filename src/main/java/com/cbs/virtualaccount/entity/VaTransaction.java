package com.cbs.virtualaccount.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "va_transaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VaTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long vaId;
    @Column(nullable = false) @Builder.Default private Instant transactionDate = Instant.now();
    @Column(nullable = false, length = 100) private String reference;
    @Column(length = 500) private String description;
    @Column(nullable = false) private BigDecimal amount;
    @Column(nullable = false, length = 10) private String transactionType;
    @Column(nullable = false, length = 10) @Builder.Default private String matchStatus = "UNMATCHED";
    @Column(length = 100) private String matchedRef;
    @Builder.Default private Instant createdAt = Instant.now();
}
