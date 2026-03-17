package com.cbs.bankdraft.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "bank_draft")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankDraft {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String draftNumber;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long debitAccountId;
    @Column(nullable = false, length = 20) private String draftType;
    @Column(nullable = false, length = 200) private String payeeName;
    @Column(nullable = false) private BigDecimal amount;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    private Long issueBranchId;
    @Column(nullable = false) @Builder.Default private LocalDate issueDate = LocalDate.now();
    private LocalDate expiryDate;
    @Column(nullable = false, length = 20) @Builder.Default private String deliveryMethod = "BRANCH_PICKUP";
    @Column(columnDefinition = "TEXT") private String deliveryAddress;
    private String micrLine;
    private String serialNumber;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "ISSUED";
    private Instant presentedAt;
    private Instant paidAt;
    @Column(columnDefinition = "TEXT") private String stopReason;
    private String reissuedAs;
    private BigDecimal commissionAmount;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
