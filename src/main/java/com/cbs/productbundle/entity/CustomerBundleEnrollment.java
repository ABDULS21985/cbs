package com.cbs.productbundle.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
@Entity @Table(name = "customer_bundle_enrollment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerBundleEnrollment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long bundleId;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> enrolledProducts;
    private BigDecimal discountApplied;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Instant enrolledAt = Instant.now();
    private Instant cancelledAt;
}
