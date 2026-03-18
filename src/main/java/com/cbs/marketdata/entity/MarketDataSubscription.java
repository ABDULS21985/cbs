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
@Table(name = "market_data_subscription")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketDataSubscription extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String subscriberSystem;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> feedIds;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> instrumentFilter;

    @Column(nullable = false, length = 10)
    private String deliveryMethod;

    @Column(nullable = false, length = 15)
    private String deliveryFrequency;

    @Column(length = 15)
    private String format;

    private Instant lastDeliveredAt;

    @Builder.Default
    private Integer deliveryFailureCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
