package com.cbs.tradeops.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "order_allocation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class OrderAllocation extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String allocationRef;

    @Column(nullable = false, length = 30)
    private String blockOrderRef;

    @Column(nullable = false, length = 30)
    private String instrumentCode;

    @Column(length = 300)
    private String instrumentName;

    @Column(nullable = false, length = 4)
    private String orderSide;

    @Column(nullable = false)
    private BigDecimal totalQuantity;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private BigDecimal avgPrice;

    @Column(nullable = false, length = 15)
    private String allocationMethod;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> allocations;

    private Instant allocatedAt;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";
}
