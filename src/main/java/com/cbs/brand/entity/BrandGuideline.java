package com.cbs.brand.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.time.LocalDate; import java.util.List; import java.util.Map;

@Entity @Table(name = "brand_guideline")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BrandGuideline extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String guidelineCode;
    @Column(nullable = false, length = 200) private String guidelineName;
    @Column(nullable = false, length = 20) private String guidelineType;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(length = 15) @Builder.Default private String brandTier = "PRIMARY";
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private Map<String, Object> content;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> assetReferences;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> applicableChannels;
    @Column(nullable = false) private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    @Column(nullable = false, length = 15) @Builder.Default private String approvalStatus = "DRAFT";
    @Column(length = 80) private String approvedBy;
}
