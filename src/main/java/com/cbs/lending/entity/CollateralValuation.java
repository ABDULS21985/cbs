package com.cbs.lending.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "collateral_valuation", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CollateralValuation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collateral_id", nullable = false)
    private Collateral collateral;

    @Column(name = "valuation_date", nullable = false)
    private LocalDate valuationDate;

    @Column(name = "market_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal marketValue;

    @Column(name = "forced_sale_value", precision = 18, scale = 2)
    private BigDecimal forcedSaleValue;

    @Column(name = "valuation_method", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ValuationMethod valuationMethod;

    @Column(name = "valuer_name", length = 100)
    private String valuerName;

    @Column(name = "valuer_organisation", length = 200)
    private String valuerOrganisation;

    @Column(name = "valuer_license_number", length = 50)
    private String valuerLicenseNumber;

    @Column(name = "report_reference", length = 100)
    private String reportReference;

    @Column(name = "report_url", length = 500)
    private String reportUrl;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "COMPLETED";

    @Column(name = "next_valuation_date")
    private LocalDate nextValuationDate;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version
    @Column(name = "version")
    private Long version;
}
