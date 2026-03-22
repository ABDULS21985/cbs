package com.cbs.dspm.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "dspm_scan")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DspmScan extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scan_code", nullable = false, unique = true, length = 30)
    private String scanCode;

    @Column(name = "scan_type", nullable = false, length = 20)
    @Builder.Default
    private String scanType = "FULL";

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String scope = "ALL";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "asset_types", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> assetTypes = List.of();

    @Column(name = "full_scan")
    @Builder.Default
    private Boolean fullScan = true;

    @Column(name = "triggered_by", length = 100)
    private String triggeredBy;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "total_assets")
    @Builder.Default
    private Integer totalAssets = 0;

    @Column(name = "assets_scanned")
    @Builder.Default
    private Integer assetsScanned = 0;

    @Column(name = "issues_found")
    @Builder.Default
    private Integer issuesFound = 0;

    @Column(name = "critical_findings")
    @Builder.Default
    private Integer criticalFindings = 0;

    @Column(name = "high_findings")
    @Builder.Default
    private Integer highFindings = 0;

    @Column(name = "medium_findings")
    @Builder.Default
    private Integer mediumFindings = 0;

    @Column(name = "low_findings")
    @Builder.Default
    private Integer lowFindings = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "duration_sec")
    @Builder.Default
    private Integer durationSec = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";
}
