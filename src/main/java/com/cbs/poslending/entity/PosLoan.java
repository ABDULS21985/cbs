package com.cbs.poslending.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "pos_loan")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PosLoan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String posLoanNumber;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long accountId;
    @Column(nullable = false, length = 80) private String merchantId;
    @Column(nullable = false, length = 200) private String merchantName;
    @Column(nullable = false, length = 40) private String merchantCategory;
    @Column(nullable = false, columnDefinition = "TEXT") private String itemDescription;
    @Column(nullable = false) private BigDecimal purchaseAmount;
    @Builder.Default private BigDecimal downPayment = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal financedAmount;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal interestRate;
    @Builder.Default private Boolean isZeroInterest = false;
    @Builder.Default private BigDecimal merchantSubsidyPct = BigDecimal.ZERO;
    @Column(nullable = false) private Integer termMonths;
    @Column(nullable = false) private BigDecimal monthlyPayment;
    @Builder.Default private Integer deferredPaymentMonths = 0;
    private BigDecimal promotionalRate;
    private LocalDate promotionalEndDate;
    private BigDecimal revertRate;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Builder.Default private Boolean disbursedToMerchant = false;
    private LocalDate disbursementDate;
    private LocalDate maturityDate;
    private LocalDate settlementDate;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
