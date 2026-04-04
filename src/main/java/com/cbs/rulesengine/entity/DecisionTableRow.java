package com.cbs.rulesengine.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "decision_table_row", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(name = "uk_decision_table_row_number",
                columnNames = {"decision_table_id", "row_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DecisionTableRow extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decision_table_id", nullable = false)
    private DecisionTable decisionTable;

    @Column(name = "row_number", nullable = false)
    private Integer rowNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_values", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> inputValues = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_values", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> outputValues = new ArrayList<>();

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "priority", nullable = false)
    private Integer priority;
}
