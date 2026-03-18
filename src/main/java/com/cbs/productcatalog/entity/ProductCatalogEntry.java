package com.cbs.productcatalog.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "product_catalog_entry")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProductCatalogEntry extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String productCode;

    @Column(nullable = false, length = 200)
    private String productName;

    @Column(nullable = false, length = 30)
    private String productFamily;

    @Column(length = 40)
    private String productSubType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 60)
    private String targetSegment;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> availableChannels;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> eligibilityCriteria;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> keyFeatures;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> feeSchedule;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> interestRates;

    @Column(columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(length = 40)
    private String regulatoryClassification;

    private BigDecimal riskWeightPct;

    @Builder.Default
    private Boolean isShariaCompliant = false;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";

    private Instant launchedAt;
    private Instant retiredAt;
}
