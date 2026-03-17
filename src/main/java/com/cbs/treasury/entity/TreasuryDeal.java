package com.cbs.treasury.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.nostro.entity.CorrespondentBank;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "treasury_deal", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TreasuryDeal extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deal_number", nullable = false, unique = true, length = 30)
    private String dealNumber;

    @Column(name = "deal_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private DealType dealType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counterparty_id")
    private CorrespondentBank counterparty;

    @Column(name = "counterparty_name", length = 200)
    private String counterpartyName;

    @Column(name = "leg1_currency", nullable = false, length = 3)
    private String leg1Currency;

    @Column(name = "leg1_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal leg1Amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leg1_account_id")
    private Account leg1Account;

    @Column(name = "leg1_value_date", nullable = false)
    private LocalDate leg1ValueDate;

    @Column(name = "leg2_currency", length = 3)
    private String leg2Currency;

    @Column(name = "leg2_amount", precision = 18, scale = 2)
    private BigDecimal leg2Amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leg2_account_id")
    private Account leg2Account;

    @Column(name = "leg2_value_date")
    private LocalDate leg2ValueDate;

    @Column(name = "deal_rate", precision = 18, scale = 8)
    private BigDecimal dealRate;

    @Column(name = "yield_rate", precision = 8, scale = 4)
    private BigDecimal yieldRate;

    @Column(name = "spread", precision = 8, scale = 4)
    private BigDecimal spread;

    @Column(name = "tenor_days")
    private Integer tenorDays;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "realized_pnl", precision = 18, scale = 2)
    @Builder.Default private BigDecimal realizedPnl = BigDecimal.ZERO;

    @Column(name = "unrealized_pnl", precision = 18, scale = 2)
    @Builder.Default private BigDecimal unrealizedPnl = BigDecimal.ZERO;

    @Column(name = "accrued_interest", precision = 18, scale = 4)
    @Builder.Default private BigDecimal accruedInterest = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default private DealStatus status = DealStatus.PENDING;

    @Column(name = "confirmed_by", length = 100) private String confirmedBy;
    @Column(name = "confirmed_at") private Instant confirmedAt;
    @Column(name = "settled_by", length = 100) private String settledBy;
    @Column(name = "settled_at") private Instant settledAt;
    @Column(name = "dealer", length = 100) private String dealer;
    @Column(name = "branch_code", length = 20) private String branchCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> metadata = new HashMap<>();

    public boolean isMatured() { return maturityDate != null && !LocalDate.now().isBefore(maturityDate); }
}
