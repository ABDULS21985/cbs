package com.cbs.secposition.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "valuation_model")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ValuationModel extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String modelCode;

    @Column(length = 200)
    private String modelName;

    @Column(length = 25)
    private String instrumentType;

    @Column(length = 25)
    private String valuationMethodology;

    @Column(length = 10)
    private String fairValueHierarchy;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> inputParameters;

    @Column(length = 10)
    private String calibrationFrequency;

    private Instant lastCalibratedAt;

    @Builder.Default
    private Boolean independentPriceVerification = false;

    @Column(length = 10)
    private String ipvFrequency;

    private LocalDate lastIpvDate;

    private BigDecimal ipvThresholdPct;

    @Column(length = 200)
    private String modelOwner;

    @Column(length = 200)
    private String validatedBy;

    @Builder.Default
    private Boolean regulatoryApproval = false;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DEVELOPMENT";
}
