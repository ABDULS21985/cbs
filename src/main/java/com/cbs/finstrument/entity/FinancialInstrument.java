package com.cbs.finstrument.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "financial_instrument")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FinancialInstrument extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String instrumentCode;

    @Column(length = 12, unique = true)
    private String isin;

    @Column(length = 9)
    private String cusip;

    @Column(length = 7)
    private String sedol;

    @Column(length = 20)
    private String ticker;

    @Column(nullable = false, length = 300)
    private String instrumentName;

    @Column(nullable = false, length = 30)
    private String instrumentType;

    @Column(nullable = false, length = 20)
    private String assetClass;

    @Column(length = 200)
    private String issuerName;

    @Column(length = 3)
    private String issuerCountry;

    @Column(nullable = false, length = 3)
    private String currency;

    private BigDecimal faceValue;
    private BigDecimal couponRate;

    @Column(length = 15)
    private String couponFrequency;

    private LocalDate maturityDate;
    private LocalDate issueDate;

    @Column(length = 10)
    private String creditRating;

    @Column(length = 30)
    private String ratingAgency;

    @Column(length = 40)
    private String exchange;

    @Column(length = 20)
    private String dayCountConvention;

    @Builder.Default
    private Integer settlementDays = 2;

    @Builder.Default
    private Boolean isActive = true;
}
