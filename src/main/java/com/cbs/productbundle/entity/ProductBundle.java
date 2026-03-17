package com.cbs.productbundle.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
@Entity @Table(name = "product_bundle")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductBundle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String bundleCode;
    @Column(nullable = false, length = 200) private String bundleName;
    @Column(nullable = false, length = 20) private String bundleType;
    @Column(columnDefinition = "TEXT") private String description;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private List<String> includedProducts;
    @Builder.Default private BigDecimal bundleDiscountPct = BigDecimal.ZERO;
    private BigDecimal bundleMonthlyFee;
    @Builder.Default private Integer minProductsRequired = 2;
    private String crossSellIncentive;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Instant createdAt = Instant.now();
}
