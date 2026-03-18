package com.cbs.compliancereport.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "compliance_report")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ComplianceReport extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String reportCode;

    @Column(nullable = false, length = 200)
    private String reportName;

    @Column(nullable = false, length = 30)
    private String reportType;

    @Column(nullable = false, length = 30)
    private String regulator;

    @Column(nullable = false, length = 10)
    private String reportingPeriod;

    @Column(nullable = false)
    private LocalDate periodStartDate;

    @Column(nullable = false)
    private LocalDate periodEndDate;

    @Column(nullable = false)
    private LocalDate dueDate;

    private LocalDate submissionDate;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> reportData;

    @Column(length = 200)
    private String fileReference;

    @Column(length = 80)
    private String preparedBy;

    @Column(length = 80)
    private String reviewedBy;

    private Instant reviewedAt;

    @Column(length = 80)
    private String submissionReference;

    @Column(length = 200)
    private String regulatorAcknowledgement;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";
}
