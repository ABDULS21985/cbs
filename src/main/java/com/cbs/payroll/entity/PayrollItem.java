package com.cbs.payroll.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name = "payroll_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayrollItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long batchId;
    @Column(nullable = false, length = 40) private String employeeId;
    @Column(nullable = false, length = 200) private String employeeName;
    @Column(nullable = false, length = 30) private String creditAccountNumber;
    private String creditBankCode;
    @Column(nullable = false) private BigDecimal grossAmount;
    @Builder.Default private BigDecimal taxAmount = BigDecimal.ZERO;
    @Builder.Default private BigDecimal pensionAmount = BigDecimal.ZERO;
    @Builder.Default private BigDecimal otherDeductions = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal netAmount;
    private String narration;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PENDING";
    @Column(columnDefinition = "TEXT") private String failureReason;
    private String paymentReference;
    @Builder.Default private Instant createdAt = Instant.now();
}
