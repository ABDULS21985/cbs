package com.cbs.syndicate.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "syndicate_arrangement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SyndicateArrangement extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String syndicateCode;

    @Column(nullable = false, length = 200)
    private String syndicateName;

    @Column(nullable = false, length = 20)
    private String syndicateType;

    @Column(nullable = false, length = 200)
    private String leadArranger;

    @Column(nullable = false)
    private BigDecimal totalFacilityAmount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(nullable = false)
    private BigDecimal ourCommitment;

    private BigDecimal ourSharePct;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> participants;

    @Column(length = 200)
    private String borrowerName;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    private Integer tenorMonths;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> pricing;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "STRUCTURING";

    private LocalDate signingDate;
    private LocalDate maturityDate;
}
