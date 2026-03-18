package com.cbs.salessupport.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.time.Instant; import java.util.List;

@Entity @Table(name = "sales_collateral")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SalesCollateral extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String collateralCode;
    @Column(nullable = false, length = 300) private String title;
    @Column(nullable = false, length = 20) private String collateralType;
    @Column(length = 30) private String productFamily;
    @Column(length = 30) private String productCode;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(length = 500) private String fileReference;
    @Column(length = 10) private String fileFormat;
    private Integer fileSizeKb;
    @Column(length = 20) private String targetAudience;
    @Column(length = 10) @Builder.Default private String language = "en";
    @JdbcTypeCode(SqlTypes.JSON) private List<String> tags;
    @Builder.Default private Integer downloadCount = 0;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
    private Instant publishedAt;
    private Instant expiresAt;
}
