package com.cbs.segmentation.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "segment_rule", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SegmentRule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "segment_id", nullable = false)
    private Segment segment;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Column(name = "operator", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private RuleOperator operator;

    @Column(name = "field_value", nullable = false, length = 500)
    private String fieldValue;

    @Column(name = "field_value_to", length = 500)
    private String fieldValueTo;

    @Column(name = "logical_group", nullable = false)
    @Builder.Default
    private Integer logicalGroup = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
