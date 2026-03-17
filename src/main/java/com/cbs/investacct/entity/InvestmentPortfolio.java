package com.cbs.investacct.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "investment_portfolio", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvestmentPortfolio {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "portfolio_code", nullable = false, unique = true, length = 20) private String portfolioCode;
    @Column(name = "portfolio_name", nullable = false, length = 100) private String portfolioName;
    @Column(name = "ifrs9_classification", nullable = false, length = 30)
    @Enumerated(EnumType.STRING) private Ifrs9Classification ifrs9Classification;
    @Column(name = "business_model", nullable = false, length = 30) private String businessModel;
    @Column(name = "asset_gl_code", length = 20) private String assetGlCode;
    @Column(name = "income_gl_code", length = 20) private String incomeGlCode;
    @Column(name = "unrealised_gl_code", length = 20) private String unrealisedGlCode;
    @Column(name = "impairment_gl_code", length = 20) private String impairmentGlCode;
    @Column(name = "max_portfolio_size", precision = 18, scale = 2) private BigDecimal maxPortfolioSize;
    @Column(name = "max_single_issuer_pct", precision = 5, scale = 2) private BigDecimal maxSingleIssuerPct;
    @Column(name = "max_single_security_pct", precision = 5, scale = 2) private BigDecimal maxSingleSecurityPct;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_security_types", columnDefinition = "jsonb")
    @Builder.Default private List<String> allowedSecurityTypes = new ArrayList<>();
    @Column(name = "currency_code", nullable = false, length = 3) @Builder.Default private String currencyCode = "USD";
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;
}
