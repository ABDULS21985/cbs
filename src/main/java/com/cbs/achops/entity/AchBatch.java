package com.cbs.achops.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "ach_batch") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AchBatch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String batchId;
    @Column(nullable = false, length = 30) private String achOperator;
    @Column(nullable = false, length = 20) private String batchType;
    @Column(nullable = false, length = 40) private String originatorId;
    @Column(nullable = false, length = 200) private String originatorName;
    @Column(nullable = false) private Long originatorAccountId;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default private Integer totalTransactions = 0;
    @Builder.Default private BigDecimal totalAmount = BigDecimal.ZERO;
    @Column(nullable = false) private LocalDate effectiveDate; private LocalDate settlementDate;
    private String fileReference;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "CREATED";
    @Builder.Default private Integer rejectionCount = 0; @Builder.Default private Integer returnCount = 0;
    private Instant submittedAt; private Instant settledAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
