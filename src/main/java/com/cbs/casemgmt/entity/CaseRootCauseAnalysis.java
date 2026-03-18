package com.cbs.casemgmt.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "case_root_cause_analysis", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CaseRootCauseAnalysis extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rca_code", nullable = false, unique = true, length = 30)
    private String rcaCode;

    @Column(name = "case_id", nullable = false)
    private Long caseId;

    @Column(name = "analysis_method", nullable = false, length = 15)
    private String analysisMethod;

    @Column(name = "analysis_date")
    private LocalDate analysisDate;

    @Column(name = "analyst_name", length = 200)
    private String analystName;

    @Column(name = "problem_statement", columnDefinition = "TEXT")
    private String problemStatement;

    @Column(name = "root_cause_category", length = 15)
    private String rootCauseCategory;

    @Column(name = "root_cause_sub_category", length = 60)
    private String rootCauseSubCategory;

    @Column(name = "root_cause_description", columnDefinition = "TEXT")
    private String rootCauseDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contributing_factors")
    private Map<String, Object> contributingFactors;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "evidence_references")
    private Map<String, Object> evidenceReferences;

    @Column(name = "customers_affected")
    private Integer customersAffected;

    @Column(name = "financial_impact", precision = 20, scale = 4)
    private BigDecimal financialImpact;

    @Column(name = "reputational_impact", length = 10)
    private String reputationalImpact;

    @Column(name = "regulatory_implication")
    @Builder.Default
    private Boolean regulatoryImplication = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "corrective_actions")
    private Map<String, Object> correctiveActions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preventive_actions")
    private Map<String, Object> preventiveActions;

    @Column(name = "lessons_learned", columnDefinition = "TEXT")
    private String lessonsLearned;

    @Column(name = "linked_knowledge_article_id")
    private Long linkedKnowledgeArticleId;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "IN_PROGRESS";
}
