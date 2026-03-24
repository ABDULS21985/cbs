package com.cbs.billing.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "bill_favorite", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"customer_id", "biller_id", "biller_customer_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BillFavorite extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "biller_id", nullable = false)
    private Biller biller;

    @Column(name = "biller_customer_id", nullable = false, length = 50)
    private String billerCustomerId;

    @Column(name = "alias", length = 100)
    private String alias;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fields", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, String> fields = new HashMap<>();

    @Column(name = "last_paid_amount", precision = 18, scale = 2)
    private BigDecimal lastPaidAmount;

    @Column(name = "last_paid_at")
    private Instant lastPaidAt;

    @Column(name = "payment_count")
    @Builder.Default
    private Integer paymentCount = 0;
}
