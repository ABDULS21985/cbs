package com.cbs.mortgage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "mortgage_loan")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MortgageLoan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String mortgageNumber;
    private Long loanApplicationId;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long accountId;
    @Column(nullable = false, length = 30) private String mortgageType;
    @Column(nullable = false, length = 20) private String repaymentType;
    @Column(nullable = false, length = 20) private String rateType;
    @Column(nullable = false, columnDefinition = "TEXT") private String propertyAddress;
    @Column(nullable = false, length = 30) private String propertyType;
    @Column(nullable = false) private BigDecimal propertyValuation;
    @Column(nullable = false) private LocalDate valuationDate;
    @Column(nullable = false, length = 20) @Builder.Default private String valuationType = "FULL";
    private BigDecimal purchasePrice;
    @Column(nullable = false) private BigDecimal principalAmount;
    @Column(nullable = false) private BigDecimal currentBalance;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(name = "ltv_at_origination", nullable = false) private BigDecimal ltvAtOrigination;
    @Column(name = "current_ltv") private BigDecimal currentLtv;
    @Column(nullable = false) private BigDecimal interestRate;
    private String baseRateReference;
    private BigDecimal marginOverBase;
    private LocalDate fixedRateEndDate;
    private BigDecimal reversionRate;
    @Column(nullable = false) private Integer termMonths;
    private Integer remainingMonths;
    private BigDecimal monthlyPayment;
    private String titleInsuranceRef;
    private String buildingInsuranceRef;
    private BigDecimal stampDutyAmount;
    private BigDecimal arrangementFee;
    private BigDecimal earlyRepaymentCharge;
    private LocalDate ercEndDate;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "APPLICATION";
    private LocalDate completionDate;
    private LocalDate firstPaymentDate;
    private LocalDate maturityDate;
    @Builder.Default private Boolean isPortable = false;
    private String portedFromProperty;
    @Builder.Default private BigDecimal annualOverpaymentPct = new BigDecimal("10.00");
    @Builder.Default private BigDecimal overpaymentsYtd = BigDecimal.ZERO;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();

    public BigDecimal calculateCurrentLtv() {
        if (propertyValuation.signum() == 0) return BigDecimal.ZERO;
        return currentBalance.divide(propertyValuation, 4, java.math.RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
    }
}
