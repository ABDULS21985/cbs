package com.cbs.productfactory.islamic.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "islamic_product_versions", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IslamicProductVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_template_id", nullable = false)
    private IslamicProductTemplate productTemplate;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "product_snapshot", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> productSnapshot = new LinkedHashMap<>();

    @Column(name = "change_description", nullable = false, length = 500)
    private String changeDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false, length = 30)
    private IslamicDomainEnums.VersionChangeType changeType;

    @Column(name = "is_material_change", nullable = false)
    @Builder.Default
    private Boolean isMaterialChange = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "changed_fields", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<String> changedFields = new ArrayList<>();

    @Column(name = "changed_by", nullable = false, length = 100)
    private String changedBy;

    @Column(name = "changed_at", nullable = false)
    @Builder.Default
    private Instant changedAt = Instant.now();

    @Column(name = "ssb_review_request_id")
    private Long ssbReviewRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ssb_review_status", nullable = false, length = 20)
    @Builder.Default
    private IslamicDomainEnums.VersionReviewStatus ssbReviewStatus = IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED;

    @Column(name = "previous_version_id")
    private Long previousVersionId;

    @Version
    @Column(name = "version")
    private Long version;
}