package com.cbs.accountsreceivable.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "receivable_invoice")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ReceivableInvoice extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String invoiceNumber;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 20) private String invoiceType;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal grossAmount;
    @Builder.Default private BigDecimal taxAmount = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal netAmount;
    private Long debitAccountId;
    @Column(nullable = false) private LocalDate dueDate;
    @Builder.Default private Integer overdueDays = 0;
    @Column(length = 80) private String paymentReference;
    @Builder.Default private BigDecimal paidAmount = BigDecimal.ZERO;
    private BigDecimal outstandingAmount;
    private Instant paidAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ISSUED";
}
