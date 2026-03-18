package com.cbs.marketdata.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "market_data_switch")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketDataSwitch extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String switchName;

    @Column(nullable = false, length = 15)
    private String switchType;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> inputFeeds;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> outputSubscribers;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> transformationRules;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> filterRules;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> validationRules;

    private Integer throughputPerSecond;
    private Integer latencyMs;
    private Instant lastProcessedAt;

    @Builder.Default
    private Integer totalProcessedToday = 0;

    @Builder.Default
    private Integer totalRejectedToday = 0;

    @Builder.Default
    private Integer totalErrorsToday = 0;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "RUNNING";
}
