package com.cbs.leasing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "lease_contract")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaseContract {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String leaseNumber;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long accountId;
    @Column(nullable = false, length = 30) private String leaseType;
    @Column(name = "ifrs16_classification", nullable = false, length = 20) @Builder.Default private String ifrs16Classification = "RIGHT_OF_USE";
    @Column(nullable = false, length = 30) private String assetCategory;
    @Column(nullable = false, columnDefinition = "TEXT") private String assetDescription;
    private String assetSerialNumber;
    private String assetMakeModel;
    private Integer assetYear;
    private String assetLocation;
    @Column(nullable = false) private BigDecimal assetFairValue;
    @Builder.Default private BigDecimal residualValue = BigDecimal.ZERO;
    private Integer usefulLifeMonths;
    @Builder.Default private String depreciationMethod = "STRAIGHT_LINE";
    @Column(nullable = false) private BigDecimal principalAmount;
    @Column(nullable = false) private BigDecimal currentBalance;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal implicitRate;
    private BigDecimal incrementalBorrowingRate;
    @Column(nullable = false) private Integer termMonths;
    @Column(nullable = false, length = 15) @Builder.Default private String paymentFrequency = "MONTHLY";
    @Column(nullable = false) private BigDecimal periodicPayment;
    @Builder.Default private Integer advancePayments = 0;
    @Builder.Default private BigDecimal securityDeposit = BigDecimal.ZERO;
    private BigDecimal purchaseOptionPrice;
    private BigDecimal rouAssetAmount;
    private BigDecimal leaseLiability;
    @Builder.Default private BigDecimal accumulatedDepreciation = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interestExpenseYtd = BigDecimal.ZERO;
    @Builder.Default private Boolean insuranceRequired = true;
    @Builder.Default private Boolean maintenanceIncluded = false;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "DRAFT";
    private LocalDate commencementDate;
    private LocalDate maturityDate;
    private BigDecimal earlyTerminationFee;
    @Column(length = 7) private String lastDepreciationMonth;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
