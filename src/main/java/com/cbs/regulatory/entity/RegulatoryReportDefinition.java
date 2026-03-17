package com.cbs.regulatory.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "regulatory_report_definition", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class RegulatoryReportDefinition extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_code", nullable = false, unique = true, length = 30)
    private String reportCode;

    @Column(name = "report_name", nullable = false, length = 200)
    private String reportName;

    @Column(name = "regulator", nullable = false, length = 50)
    private String regulator;

    @Column(name = "frequency", nullable = false, length = 20)
    private String frequency;

    @Column(name = "report_category", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ReportCategory reportCategory;

    @Column(name = "data_query", columnDefinition = "TEXT")
    private String dataQuery;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "template_config", columnDefinition = "jsonb")
    private Map<String, Object> templateConfig;

    @Column(name = "output_format", length = 10)
    @Builder.Default private String outputFormat = "XLSX";

    @Column(name = "is_active", nullable = false)
    @Builder.Default private Boolean isActive = true;
}
