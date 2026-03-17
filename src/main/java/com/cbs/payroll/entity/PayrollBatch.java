package com.cbs.payroll.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "payroll_batch")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayrollBatch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String batchId;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 200) private String companyName;
    @Column(nullable = false) private Long debitAccountId;
    @Column(nullable = false, length = 20) private String payrollType;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private LocalDate payPeriodStart;
    @Column(nullable = false) private LocalDate payPeriodEnd;
    @Column(nullable = false) private LocalDate paymentDate;
    @Column(nullable = false) private BigDecimal totalGross;
    @Builder.Default private BigDecimal totalDeductions = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal totalNet;
    @Column(nullable = false) private Integer employeeCount;
    @Builder.Default private BigDecimal totalTax = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalPensionEmployer = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalPensionEmployee = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalNhf = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalNsitf = BigDecimal.ZERO;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "DRAFT";
    private String approvedBy;
    private Instant approvedAt;
    private Instant processedAt;
    @Builder.Default private Integer failedCount = 0;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
