package com.cbs.segmentation.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "segment", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Segment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "segment_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SegmentType segmentType = SegmentType.RULE_BASED;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 100;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "color_code", length = 7)
    private String colorCode;

    @Column(name = "icon", length = 50)
    private String icon;

    @OneToMany(mappedBy = "segment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SegmentRule> rules = new ArrayList<>();

    @OneToMany(mappedBy = "segment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CustomerSegment> customerSegments = new ArrayList<>();

    public void addRule(SegmentRule rule) {
        rules.add(rule);
        rule.setSegment(this);
    }
}
