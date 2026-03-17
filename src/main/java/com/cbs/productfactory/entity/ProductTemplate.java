package com.cbs.productfactory.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "product_template", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "template_code", nullable = false, unique = true, length = 30) private String templateCode;
    @Column(name = "template_name", nullable = false, length = 200) private String templateName;
    @Column(name = "product_category", nullable = false, length = 20) private String productCategory;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "interest_config", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> interestConfig = new HashMap<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "fee_config", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> feeConfig = new HashMap<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "limit_config", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> limitConfig = new HashMap<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "eligibility_rules", columnDefinition = "jsonb") @Builder.Default private List<Map<String, Object>> eligibilityRules = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "lifecycle_rules", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> lifecycleRules = new HashMap<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "gl_mapping", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> glMapping = new HashMap<>();
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "DRAFT";
    @Column(name = "approved_by", length = 100) private String approvedBy;
    @Column(name = "approved_at") private Instant approvedAt;
    @Column(name = "activated_at") private Instant activatedAt;
    @Column(name = "template_version", nullable = false) @Builder.Default private Integer templateVersion = 1;
    @Column(name = "parent_template_id") private Long parentTemplateId;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;
}
