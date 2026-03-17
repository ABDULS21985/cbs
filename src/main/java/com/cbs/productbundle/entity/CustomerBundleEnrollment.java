package com.cbs.productbundle.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
@Entity @Table(name = "customer_bundle_enrollment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerBundleEnrollment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long bundleId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private List<String> enrolledProducts;
    @Column(nullable = false) @Builder.Default private LocalDate enrollmentDate = LocalDate.now();
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    private BigDecimal discountApplied;
    @Builder.Default private Instant createdAt = Instant.now();
}
